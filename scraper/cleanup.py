#!/usr/bin/env python
"""Delete stale articles: older than N days AND not protected/bookmarked.

    python cleanup.py            # DRY RUN — shows what would be deleted
    python cleanup.py --commit   # actually delete
    python cleanup.py --days 60 --commit

CLAUDE.md rule:
    DELETE FROM articles
    WHERE published_at < NOW() - INTERVAL '45 days' AND protected = false

This script is defensive about the LIVE schema (memory: db-schema-divergence):
  * If the `protected` column exists, it is honoured (protected rows kept).
  * If a `bookmarks` table exists, any bookmarked article is kept regardless
    of age (covers the live schema, whose bookmarks may not flip `protected`).
Deletion is destructive and IRREVERSIBLE, so the default is a dry run; pass
--commit to apply.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import config, db          # noqa: E402  (config also runs load_env)

DEFAULT_DAYS = 45


def _table_exists(conn, table: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name = %s", (table,)
        )
        return cur.fetchone() is not None


def _build_where(conn, days: int) -> tuple[str, list]:
    conds = ["published_at IS NOT NULL",
             "published_at < NOW() - (%s || ' days')::interval"]
    params: list = [str(days)]

    if db.column_exists(conn, "articles", "protected"):
        conds.append("COALESCE(protected, false) = false")

    if _table_exists(conn, "bookmarks"):
        # Keep anything currently bookmarked. bookmarks.article_id is varchar
        # in the live schema while articles.id is text -> cast both to text.
        conds.append(
            "id::text NOT IN "
            "(SELECT article_id::text FROM bookmarks WHERE article_id IS NOT NULL)"
        )

    return " AND ".join(conds), params


def main() -> None:
    ap = argparse.ArgumentParser(description="Delete stale, unprotected articles.")
    ap.add_argument("--days", type=int, default=DEFAULT_DAYS,
                    help=f"age threshold in days (default {DEFAULT_DAYS})")
    ap.add_argument("--commit", action="store_true",
                    help="actually delete (default is a dry run)")
    args = ap.parse_args()

    if not config.db_dsn():
        raise SystemExit("No DB DSN configured (set NEONDB_URL / DATABASE_URL / NEON_DSN).")

    conn = db.connect()
    try:
        where, params = _build_where(conn, args.days)

        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM articles WHERE {where}", params)
            n = cur.fetchone()[0]

        print(f"Stale articles (> {args.days} days, not protected/bookmarked): {n}")
        if n:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT title, published_at FROM articles WHERE {where} "
                    f"ORDER BY published_at ASC LIMIT 10",
                    params,
                )
                print("  sample:")
                for title, pub in cur.fetchall():
                    snippet = (title or "")[:70]
                    print(f"    - [{pub:%Y-%m-%d}] {snippet}" if pub else f"    - {snippet}")

        if not args.commit:
            print("\nDRY RUN — nothing deleted. Re-run with --commit to apply.")
            return

        if n == 0:
            print("Nothing to delete.")
            return

        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM articles WHERE {where}", params)
            deleted = cur.rowcount
        conn.commit()
        print(f"\nDeleted {deleted} stale articles.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
