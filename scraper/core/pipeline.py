"""Enrichment + per-source orchestration (crawl -> filter -> enrich -> store).

``enrich_article`` turns one candidate into a full DB-ready record.
``run_source`` drives a SourceSpec end to end and upserts into the live DB.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from bs4 import BeautifulSoup

from core import config, db, extract, http, nlp, summarizer
from core.cleaner import (
    clean_text,
    date_from_url,
    is_fresh,
    source_meta,
    url_id,
)


@dataclass
class SourceSpec:
    """Describes one news source for the pipeline."""
    key: str                              # "cnn"
    name: str                             # "CNN"
    categories: dict[str, list[str]]      # English Title-case topic -> [index URLs]
    language: str = "en"
    use_playwright: bool = False          # render index + article with Playwright
    skip_zero_shot: bool = False          # trust section->topic mapping (Yahoo)
    target_per_category: int = field(default=config.TARGET_PER_CATEGORY)


# ═══════════════════════════════════════════════════════════════════
# Enrich one candidate
# ═══════════════════════════════════════════════════════════════════
def enrich_article(item: dict, spec: SourceSpec) -> Optional[dict]:
    url = item["url"]
    topic = item["topic"]
    print(f"  enrich [{topic}] {url}")

    try:
        nlp.ensure_nltk()
        from newspaper import Article, Config

        np_cfg = Config()
        np_cfg.browser_user_agent = config.USER_AGENT
        np_cfg.request_timeout = config.REQUEST_TIMEOUT

        art = Article(url, config=np_cfg)
        rendered_html = http.fetch_rendered_html(url) if spec.use_playwright else None
        if rendered_html:
            art.set_html(rendered_html)
            art.parse()
            try:
                art.nlp()
            except Exception:
                pass
        else:
            art.download()
            art.parse()
            art.nlp()

        text = clean_text(art.text)
        if len(text) < config.MIN_TEXT_LEN:
            print("     too short, skip")
            return None

        pub_dt = art.publish_date
        if not is_fresh(url, pub_dt):
            print("     too old, skip")
            return None

        # Raw soup for meta extraction (reuse rendered html when present).
        if rendered_html:
            soup = BeautifulSoup(rendered_html, "html.parser")
        else:
            soup = http.fetch_soup(url, timeout=12) or BeautifulSoup("", "html.parser")

        jsonld_items = extract.extract_jsonld(soup)
        jsonld = extract.jsonld_article(jsonld_items)
        og_data = extract.extract_og(soup, url)
        video_url = extract.extract_video(soup, url, jsonld_items)
        related_urls = extract.extract_related(soup, url)
        author_info = extract.extract_author(soup, url, art.authors, jsonld)

        entities = nlp.run_ner(text)
        sentiment = nlp.analyze_sentiment(text, topic)
        ai_summary = summarizer.build_ai_summary(text)
        toxicity = nlp.run_toxicity(text)
        keywords = nlp.extract_keywords(text, art.keywords or [], entities, top_n=30)
        readability = nlp.reading_metrics(text)
        language = nlp.detect_language(text)
        if spec.language != "en" and (not language or language == "en"):
            language = spec.language

        desc = (
            og_data.get("og_description")
            or jsonld.get("jsonld_description")
            or (art.summary.strip() if art.summary else "")
            or text[:300] + "..."
        )

        pub_iso = None
        if pub_dt:
            if pub_dt.tzinfo is None:
                pub_dt = pub_dt.replace(tzinfo=timezone.utc)
            pub_iso = pub_dt.isoformat()
        pub_iso = (
            pub_iso
            or og_data.get("published_meta")
            or jsonld.get("jsonld_datePublished")
            or datetime.now(timezone.utc).isoformat()
        )
        mod_iso = og_data.get("modified_meta") or jsonld.get("jsonld_dateModified")
        canonical = og_data.get("canonical_url") or url

        record = {
            "id": url_id(canonical),
            "url": url,
            "canonical_url": canonical,
            "source": source_meta(url),
            "author": author_info["name"],
            "author_url": author_info["url"],
            "title": art.title or og_data.get("og_title") or jsonld.get("jsonld_headline", "Untitled"),
            "description": desc,
            "content": text,
            "ai_summary": ai_summary,
            "url_to_image": art.top_image or jsonld.get("jsonld_image"),
            "images": og_data.get("images", []),
            "video_url": video_url,
            "published_at": pub_iso,
            "modified_at": mod_iso,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "topic": topic,
            "section": og_data.get("section") or jsonld.get("jsonld_genre"),
            "meta_tags": og_data.get("meta_tags", []),
            "og_type": og_data.get("og_type"),
            "language": language,
            "sentiment": sentiment,
            "toxicity": toxicity,
            "keywords": keywords,
            "entities": entities,
            "readability": readability,
            "related_urls": related_urls,
            "ai_relevance": item.get("ai_relevance_score", 1.0),
            "ai_top_label": item.get("ai_top_label"),
            "ai_label_scores": item.get("ai_label_scores", {}),
            "is_premium": jsonld.get("jsonld_isPremium"),
            "is_accessible_free": jsonld.get("jsonld_isAccessibleForFree"),
            "jsonld_word_count": jsonld.get("jsonld_wordCount"),
            "og": {
                "title": og_data.get("og_title"),
                "description": og_data.get("og_description"),
                "site_name": og_data.get("og_site_name"),
                "locale": og_data.get("og_locale"),
                "twitter_card": og_data.get("twitter_card"),
                "twitter_site": og_data.get("twitter_site"),
            },
        }

        s = sentiment
        print(
            f"     ok {s['type'].upper()} | conf={s['score']:.2f} | pol={s['comparative']:+.2f} | "
            f"kw={len(keywords)} | wc={readability['word_count']}"
            f"{' | video' if video_url else ''}"
        )
        return record

    except Exception as e:                          # noqa: BLE001
        print(f"     error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════
# Run one source end to end
# ═══════════════════════════════════════════════════════════════════
def _assign_topic(candidates: list[dict]) -> list[dict]:
    """Section-trusted path (skip zero-shot): mark every candidate relevant."""
    for item in candidates:
        item.setdefault("ai_relevance_score", 1.0)
        item.setdefault("ai_top_label", item["topic"])
        item.setdefault("ai_label_scores", {})
    return candidates


def run_source(spec: SourceSpec, *, to_db: bool = True, conn=None) -> list[dict]:
    """Crawl, filter, enrich and (optionally) upsert one source. Returns records."""
    target = spec.target_per_category
    per_src_mult = config.CRAWL_MULT

    owns_conn = False
    if to_db and conn is None:
        conn = db.connect()
        owns_conn = True

    global_seen: set[str] = set()
    if to_db:
        global_seen |= db.existing_canonicals(conn)

    collected: list[dict] = []
    print("=" * 70)
    print(f"SOURCE: {spec.name}  (target {target}/category)")
    print("=" * 70)

    for category, urls in spec.categories.items():
        print(f"\n-- {category} --")
        per_src_target = max(20, (target * per_src_mult) // max(1, len(urls)))

        raw_pool: list[dict] = []
        for u in urls:
            raw_pool += http.crawl_source(u, category, per_src_target, rendered=spec.use_playwright)

        deduped: dict[str, dict] = {}
        for it in raw_pool:
            deduped.setdefault(it["url"], it)
        raw_pool = list(deduped.values())

        if spec.skip_zero_shot:
            validated = _assign_topic(raw_pool)
        else:
            validated = nlp.zero_shot_filter(raw_pool)

        validated.sort(
            key=lambda x: (
                -x.get("ai_relevance_score", 0),
                -(date_from_url(x["url"]).timestamp() if date_from_url(x["url"]) else 0.0),
            )
        )

        cat_articles: list[dict] = []
        for item in validated:
            if len(cat_articles) >= target:
                break
            if item["url"] in global_seen:
                continue
            record = enrich_article(item, spec)
            if record is None:
                continue
            ckey = record["canonical_url"]
            if ckey in global_seen:
                continue
            global_seen.add(ckey)

            if to_db:
                try:
                    db.insert_article(conn, record)
                except Exception as e:              # noqa: BLE001
                    conn.rollback()
                    print(f"     DB insert error: {e}")
            cat_articles.append(record)

        collected.extend(cat_articles)
        print(f"  collected {len(cat_articles)} for {category}")

    if owns_conn:
        conn.close()

    print(f"\n{spec.name}: {len(collected)} articles total")
    return collected
