#!/usr/bin/env python
"""Delete stale articles: older than N days AND not protected/bookmarked.

The default run is a DRY RUN that only reports what would be deleted. The
--commit flag applies the deletion (and removes orphan translations), --days
overrides the 45-day threshold, and --vacuum / --vacuum-full reclaim
dead-tuple space afterwards.

This script is defensive about the LIVE schema (memory: db-schema-divergence):
  * If the `protected` column exists, it is honoured (protected rows kept).
  * If a `bookmarks` table exists, any bookmarked article is kept regardless
    of age (covers the live schema, whose bookmarks may not flip `protected`).
  * If a `posts` table exists (F7 feature), articles attached to posts are
    kept too — deleting them would blank the embedded cards in the feed.
  * Orphan `translations` rows (their article already gone) are deleted on
    commit; they are dead weight NeonDB still bills as storage.
Deletion is destructive and IRREVERSIBLE, so the default is a dry run.
VACUUM runs on a separate autocommit connection (it cannot run inside a
transaction block); VACUUM FULL takes an ACCESS EXCLUSIVE lock and needs
copy space — rows are deleted first, small tables vacuumed first.
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

    if _table_exists(conn, "posts"):
        # Keep articles attached to user posts (F7 feature) — same guard as
        # bookmarks. No-op until the posts table exists.
        conds.append(
            "id::text NOT IN "
            "(SELECT article_id::text FROM posts WHERE article_id IS NOT NULL)"
        )

    return " AND ".join(conds), params


_ORPHAN_TRANSLATIONS_WHERE = (
    "article_id IS NOT NULL AND NOT EXISTS "
    "(SELECT 1 FROM articles a WHERE a.id::text = translations.article_id::text)"
)


def _orphan_translations(conn, commit: bool) -> None:
    """Count (and on --commit delete) translations whose article is gone."""
    if not _table_exists(conn, "translations"):
        return
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM translations WHERE {_ORPHAN_TRANSLATIONS_WHERE}")
        n = cur.fetchone()[0]
    print(f"Orphan translations (article already deleted): {n}")
    if commit and n:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM translations WHERE {_ORPHAN_TRANSLATIONS_WHERE}")
            deleted = cur.rowcount
        conn.commit()
        print(f"Deleted {deleted} orphan translations.")


def _vacuum(full: bool) -> None:
    """VACUUM (optionally FULL) the heavy tables. Needs its own autocommit
    connection — VACUUM cannot run inside a transaction block. Small tables
    first: VACUUM FULL needs copy space, scarce when the DB is nearly full."""
    import psycopg2
    conn = psycopg2.connect(config.db_dsn())
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            statements = (
                ["VACUUM (FULL, ANALYZE) translations",
                 "VACUUM (FULL, ANALYZE) articles"] if full else []
            ) + ["VACUUM ANALYZE"]
            for stmt in statements:
                print(f"{stmt} ...")
                try:
                    cur.execute(stmt)
                except Exception as e:              # noqa: BLE001
                    print(f"  failed (continuing): {e}")
    finally:
        conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Delete stale, unprotected articles.")
    ap.add_argument("--days", type=int, default=DEFAULT_DAYS,
                    help=f"age threshold in days (default {DEFAULT_DAYS})")
    ap.add_argument("--commit", action="store_true",
                    help="actually delete (default is a dry run)")
    ap.add_argument("--vacuum", action="store_true",
                    help="VACUUM ANALYZE afterwards (reclaims dead tuples)")
    ap.add_argument("--vacuum-full", action="store_true",
                    help="VACUUM FULL translations+articles, then VACUUM ANALYZE "
                         "(ACCESS EXCLUSIVE lock; needs copy space)")
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
            _orphan_translations(conn, commit=False)
            print("\nDRY RUN — nothing deleted. Re-run with --commit to apply.")
            return

        if n:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM articles WHERE {where}", params)
                deleted = cur.rowcount
            conn.commit()
            print(f"\nDeleted {deleted} stale articles.")
        else:
            print("No stale articles to delete.")

        # Articles just got deleted -> their translations are now orphans too.
        _orphan_translations(conn, commit=True)
    finally:
        conn.close()

    if args.vacuum or args.vacuum_full:
        _vacuum(full=args.vacuum_full)


if __name__ == "__main__":
    main()
