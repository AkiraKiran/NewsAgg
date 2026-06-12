"""Enrichment + per-source orchestration (crawl -> filter -> enrich -> store).

``enrich_article`` turns one candidate into a full DB-ready record.
``run_source`` drives a SourceSpec end to end and upserts into the live DB.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from bs4 import BeautifulSoup

from core import config, db, extract, http, nlp, summarizer
from core.cleaner import (
    clean_text,
    date_from_url,
    is_fresh,
    normalize_canonical,
    source_meta,
    strip_boilerplate,
    truncate_content,
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
    content_selectors: list[str] = field(default_factory=list)   # CSS selectors tried first for the body
    boilerplate_extra: list[re.Pattern] = field(default_factory=list)  # site-specific line filters


# ═══════════════════════════════════════════════════════════════════
# Body extraction (trafilatura-first, boilerplate-aware)
# ═══════════════════════════════════════════════════════════════════
def _lead_sentences(text: str, limit: int = 220) -> str:
    """First 1-2 sentences of the clean body — used as the description
    fallback instead of a blind text[:300] cut. CJK-aware split."""
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?。！？])\s*", text.replace("\n", " "))
    out = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if out and len(out) + len(p) + 1 > limit:
            break
        out = f"{out} {p}".strip()
        if len(out) >= limit:
            break
    return out or text[:limit]


def _extract_body(art, page_html: Optional[str], spec: SourceSpec, soup) -> str:
    """Best clean body we can get, in order of precision:
    1. source-specific CSS selectors (e.g. Yahoo TW ``.caas-body``),
    2. trafilatura on the page HTML (DOM-aware boilerplate removal),
    3. newspaper3k's text (legacy behavior — concatenates everything).
    newspaper3k stays the source of title/authors/top_image/publish_date."""
    np_text = clean_text(art.text or "")

    for sel in spec.content_selectors:
        try:
            nodes = soup.select(sel)
        except Exception:
            nodes = []
        if nodes:
            text = clean_text("\n\n".join(n.get_text("\n", strip=True) for n in nodes))
            if len(text) >= max(config.MIN_TEXT_LEN, int(len(np_text) * 0.5)):
                return text

    if page_html:
        try:
            import trafilatura
            t = trafilatura.extract(
                page_html,
                favor_precision=True,
                include_comments=False,
                include_tables=False,
            )
            if t:
                t = clean_text(t)
                # Accept unless trafilatura lost a big chunk of the body —
                # shorter IS expected (that's the boilerplate going away).
                if len(t) >= int(len(np_text) * 0.6) or len(t) > len(np_text):
                    return t
        except Exception as e:                      # noqa: BLE001
            print(f"     trafilatura failed ({e}); falling back to newspaper3k")

    return np_text


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

        pub_dt = art.publish_date
        if not is_fresh(url, pub_dt):
            print("     too old, skip")
            return None

        # Raw soup for body + meta extraction. Reuse the HTML newspaper3k
        # already downloaded instead of fetching the page a second time.
        page_html = rendered_html or getattr(art, "html", "") or ""
        if page_html:
            soup = BeautifulSoup(page_html, "html.parser")
        else:
            soup = http.fetch_soup(url, timeout=12) or BeautifulSoup("", "html.parser")

        text = _extract_body(art, page_html, spec, soup)
        text = strip_boilerplate(text, spec.boilerplate_extra)
        text = truncate_content(text, config.MAX_CONTENT_CHARS)
        if len(text) < config.MIN_TEXT_LEN:
            print("     too short, skip")
            return None
        if spec.language == "en" and len(text.split()) < config.MIN_WORDS_EN:
            print("     too few words, skip")
            return None

        jsonld_items = extract.extract_jsonld(soup)
        jsonld = extract.jsonld_article(jsonld_items)
        og_data = extract.extract_og(soup, url)
        video_url = extract.extract_video(soup, url, jsonld_items)
        related_urls = extract.extract_related(soup, url)
        author_info = extract.extract_author(soup, url, art.authors, jsonld)

        # Language first — sentiment/summary/toxicity are routed by it
        # (FinBERT/BART/toxic-bert are English-only; XLM-R models handle the rest).
        language = nlp.detect_language(text)
        if spec.language != "en" and (not language or language == "en"):
            language = spec.language          # trust the spec (e.g. yahoo_tw -> zh-TW)

        entities = nlp.run_ner(text)
        sentiment = nlp.analyze_sentiment(text, topic, language)
        ai_summary = summarizer.build_ai_summary(text, language)
        toxicity = nlp.run_toxicity(text, language)
        keywords = nlp.extract_keywords(text, art.keywords or [], entities,
                                        top_n=config.KEYWORDS_TOP_N)
        readability = nlp.reading_metrics(text)

        desc = (
            og_data.get("og_description")
            or jsonld.get("jsonld_description")
            or (art.summary.strip() if art.summary else "")
            or _lead_sentences(text)
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
        canonical = normalize_canonical(og_data.get("canonical_url") or url)

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


def run_source(
    spec: SourceSpec,
    *,
    to_db: bool = True,
    conn=None,
    global_seen: Optional[set[str]] = None,
    stats: Optional[dict] = None,
) -> list[dict]:
    """Crawl, filter, enrich and (optionally) upsert one source. Returns records.

    ``global_seen`` / ``stats`` let run_all share one dedup set and one
    inserted/updated/unchanged/errors counter across all sources (the caller
    preloads existing canonicals once). Standalone calls keep the old behavior.
    """
    target = spec.target_per_category
    per_src_mult = config.CRAWL_MULT

    owns_conn = False
    if to_db and conn is None:
        conn = db.connect()
        owns_conn = True

    if global_seen is None:
        global_seen = set()
        if to_db:
            global_seen |= db.existing_canonicals(conn)
    if stats is None:
        stats = {"inserted": 0, "updated": 0, "unchanged": 0, "errors": 0}

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
                    status = db.insert_article(conn, record)
                    stats[status] = stats.get(status, 0) + 1
                except Exception as e:              # noqa: BLE001
                    conn.rollback()
                    stats["errors"] = stats.get("errors", 0) + 1
                    print(f"     DB insert error: {e}")
            cat_articles.append(record)

        collected.extend(cat_articles)
        print(f"  collected {len(cat_articles)} for {category}")

    if owns_conn:
        conn.close()

    print(f"\n{spec.name}: {len(collected)} articles total")
    return collected
