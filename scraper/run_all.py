#!/usr/bin/env python
"""Run every source sequentially against the live DB.

    python run_all.py
    python run_all.py --no-db --target 10

Used by .github/workflows/scraper.yml on a schedule. One source failing never
aborts the rest — each is wrapped in try/except.
"""
from __future__ import annotations

import argparse
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import config, db          # noqa: E402  (config also runs load_env)
from core.pipeline import run_source  # noqa: E402
from sources import all_specs         # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description="Scrape all news sources.")
    ap.add_argument("--no-db", action="store_true", help="enrich only; no DB writes")
    ap.add_argument("--target", type=int, default=None,
                    help="articles per category per source (default: config)")
    args = ap.parse_args()

    to_db = not args.no_db
    if to_db and not config.db_dsn():
        print("No DB DSN configured; running with --no-db semantics.")
        to_db = False

    conn = db.connect() if to_db else None
    all_records: list[dict] = []

    for spec in all_specs():
        if args.target is not None:
            spec.target_per_category = args.target
        try:
            all_records += run_source(spec, to_db=to_db, conn=conn)
        except Exception as e:                      # noqa: BLE001
            print(f"!! source {spec.key} failed: {e}")

    if conn is not None:
        conn.close()

    by_src = Counter(r["source"]["id"] for r in all_records)
    by_topic = Counter(r["topic"] for r in all_records)
    by_sent = Counter(r["sentiment"]["type"] for r in all_records)

    print("\n" + "=" * 70)
    print(f"DONE — {len(all_records)} articles across {len(by_src)} sources")
    print("=" * 70)
    print("By source:", dict(by_src))
    print("By topic :", dict(by_topic))
    print("By tone  :", dict(by_sent))


if __name__ == "__main__":
    main()
