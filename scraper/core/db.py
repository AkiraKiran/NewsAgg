"""NeonDB persistence — upsert articles/sources/authors against the LIVE schema.

IMPORTANT (do not "fix" this to CLAUDE.md's schema):
The live NeonDB uses the OLD scraper schema, NOT CLAUDE.md's target schema.
The project decision (memory: db-schema-divergence) is to ADAPT CODE TO THE
LIVE DB, never migrate. So this upsert intentionally writes:
    articles.id            text  (sha256[:16] of canonical_url)
    articles.source_id     text  ("cnn" / "bbc" / "aljazeera" / "yahoo_tw")
    articles.author_id     bigint -> authors table
    sentiment_polarity + sentiment_pos/neu/neg   (NOT sentiment_prob_*)
    ai_relevance           (NOT ai_confidence)
    keywords/entities/images/related_urls/og_data/...  JSONB
This matches the ~364 existing rows and the TS server's read contract.
"""
from __future__ import annotations

import logging
from typing import Optional

from core import config

_log = logging.getLogger(__name__)


def get_dsn() -> Optional[str]:
    return config.db_dsn()


def connect():
    """Open a psycopg2 connection to the live DB. Raises if no DSN configured."""
    import psycopg2
    dsn = get_dsn()
    if not dsn:
        raise RuntimeError(
            "No DB connection string. Set NEONDB_URL (or DATABASE_URL / NEON_DSN) "
            "in scraper/.env or server/.env."
        )
    return psycopg2.connect(dsn)


def column_exists(conn, table: str, column: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
            """,
            (table, column),
        )
        return cur.fetchone() is not None


def existing_canonicals(conn) -> set[str]:
    """All canonical_urls already stored — used to skip re-enriching duplicates."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT canonical_url FROM articles WHERE canonical_url IS NOT NULL")
            return {row[0] for row in cur.fetchall()}
    except Exception as e:                          # noqa: BLE001
        _log.warning("Could not preload existing canonicals: %s", e)
        return set()


def canonical_exists(conn, canonical_url: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM articles WHERE canonical_url = %s LIMIT 1", (canonical_url,))
        return cur.fetchone() is not None


# ═══════════════════════════════════════════════════════════════════
# Upsert — preserved from scraper4/5 (writes the live schema)
# ═══════════════════════════════════════════════════════════════════
def insert_article(conn, record: dict) -> str:
    """Upsert one enriched article (+ its source and author). Commits on success.

    Returns 'inserted' | 'updated' | 'unchanged'. The DO UPDATE is guarded by
    IS DISTINCT FROM so a re-scrape of an unchanged article writes NOTHING —
    the old unconditional update rewrote content (TOAST) every run, which is
    what bloated NeonDB with dead tuples + WAL history.
    """
    import psycopg2.extras as extras

    src = record["source"]
    sent = record["sentiment"]
    tox = record["toxicity"]
    read = record["readability"]
    og = record["og"]

    # upsert source
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sources (id, name, domain, country, language, logo_url)
            VALUES (%(id)s,%(name)s,%(domain)s,%(country)s,%(language)s,%(logo)s)
            ON CONFLICT (id) DO NOTHING
            """,
            {**src, "logo": src.get("logo")},
        )

    # upsert author
    author_id = None
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO authors (name, author_url, source_id)
            VALUES (%(name)s, %(url)s, %(source_id)s)
            ON CONFLICT (author_url) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            {"name": record["author"], "url": record.get("author_url"), "source_id": src["id"]},
        )
        row = cur.fetchone()
        if row:
            author_id = row[0]

    # upsert article
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO articles (
                id, url, canonical_url, source_id, author_id,
                title, description, content, ai_summary,
                url_to_image, video_url, topic, section, og_type, language,
                published_at, modified_at, scraped_at,
                sentiment_type, sentiment_score, sentiment_polarity,
                sentiment_pos, sentiment_neu, sentiment_neg, sentiment_model,
                toxicity_label, toxicity_score,
                word_count, reading_time_min, flesch_score, flesch_kincaid, smog_index,
                ai_relevance, ai_top_label, is_premium, is_accessible_free,
                keywords, entities, images, related_urls,
                og_data, ai_label_scores, meta_tags
            ) VALUES (
                %(id)s, %(url)s, %(canonical_url)s, %(source_id)s, %(author_id)s,
                %(title)s, %(description)s, %(content)s, %(ai_summary)s,
                %(url_to_image)s, %(video_url)s, %(topic)s, %(section)s, %(og_type)s, %(language)s,
                %(published_at)s, %(modified_at)s, %(scraped_at)s,
                %(sentiment_type)s, %(sentiment_score)s, %(sentiment_polarity)s,
                %(sentiment_pos)s, %(sentiment_neu)s, %(sentiment_neg)s, %(sentiment_model)s,
                %(toxicity_label)s, %(toxicity_score)s,
                %(word_count)s, %(reading_time_min)s, %(flesch_score)s, %(flesch_kincaid)s, %(smog_index)s,
                %(ai_relevance)s, %(ai_top_label)s, %(is_premium)s, %(is_accessible_free)s,
                %(keywords)s, %(entities)s, %(images)s, %(related_urls)s,
                %(og_data)s, %(ai_label_scores)s, %(meta_tags)s
            )
            ON CONFLICT (canonical_url) DO UPDATE SET
                title              = EXCLUDED.title,
                description        = EXCLUDED.description,
                content            = EXCLUDED.content,
                ai_summary         = EXCLUDED.ai_summary,
                sentiment_type     = EXCLUDED.sentiment_type,
                sentiment_score    = EXCLUDED.sentiment_score,
                sentiment_polarity = EXCLUDED.sentiment_polarity,
                keywords           = EXCLUDED.keywords,
                scraped_at         = EXCLUDED.scraped_at
            WHERE articles.title       IS DISTINCT FROM EXCLUDED.title
               OR articles.description IS DISTINCT FROM EXCLUDED.description
               OR articles.content     IS DISTINCT FROM EXCLUDED.content
            RETURNING (xmax = 0) AS inserted
            """,
            {
                "id": record["id"],
                "url": record["url"],
                "canonical_url": record["canonical_url"],
                "source_id": src["id"],
                "author_id": author_id,
                "title": record["title"],
                "description": record.get("description"),
                "content": record.get("content"),
                "ai_summary": record.get("ai_summary"),
                "url_to_image": record.get("url_to_image"),
                "video_url": record.get("video_url"),
                "topic": record["topic"],
                "section": record.get("section"),
                "og_type": record.get("og_type"),
                "language": record.get("language", "en"),
                "published_at": record.get("published_at"),
                "modified_at": record.get("modified_at"),
                "scraped_at": record.get("scraped_at"),
                "sentiment_type": sent["type"],
                "sentiment_score": sent["score"],
                "sentiment_polarity": sent["comparative"],
                "sentiment_pos": sent["probabilities"]["positive"],
                "sentiment_neu": sent["probabilities"]["neutral"],
                "sentiment_neg": sent["probabilities"]["negative"],
                "sentiment_model": sent["model"],
                "toxicity_label": tox["label"],
                "toxicity_score": tox["score"],
                "word_count": read["word_count"],
                "reading_time_min": read["reading_time_min"],
                "flesch_score": read["flesch_score"],
                "flesch_kincaid": read["flesch_kincaid"],
                "smog_index": read["smog_index"],
                "ai_relevance": record.get("ai_relevance"),
                "ai_top_label": record.get("ai_top_label"),
                "is_premium": record.get("is_premium"),
                "is_accessible_free": record.get("is_accessible_free"),
                "keywords": extras.Json(record.get("keywords", [])),
                "entities": extras.Json(record.get("entities", {})),
                "images": extras.Json(record.get("images", [])),
                "related_urls": extras.Json(record.get("related_urls", [])),
                "og_data": extras.Json(og),
                "ai_label_scores": extras.Json(record.get("ai_label_scores", {})),
                "meta_tags": extras.Json(record.get("meta_tags", [])),
            },
        )
        row = cur.fetchone()
    conn.commit()
    if row is None:
        return "unchanged"           # WHERE guard filtered the update out
    return "inserted" if row[0] else "updated"


def insert_all(dsn_or_conn, articles: list[dict]) -> int:
    """Bulk upsert. Accepts a DSN string or an open connection."""
    if isinstance(dsn_or_conn, str):
        import psycopg2
        conn = psycopg2.connect(dsn_or_conn)
        owns = True
    else:
        conn = dsn_or_conn
        owns = False

    ok = 0
    for art in articles:
        try:
            insert_article(conn, art)
            ok += 1
        except Exception as e:                      # noqa: BLE001
            conn.rollback()
            print(f"   DB insert error: {e}")
    if owns:
        conn.close()
    print(f"\nPostgreSQL: {ok}/{len(articles)} articles upserted.")
    return ok
