#!/usr/bin/env python
"""Run one source end to end.

Takes a required source flag (cnn | bbc | aljazeera | yahoo_tw) plus optional
no-db (enrich only), target (articles per category) and json (dump path)
flags — see CLAUDE.md for the runbook.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import config              # noqa: E402  (also runs load_env)
from core.pipeline import run_source  # noqa: E402
from sources import get_spec          # noqa: E402


def _dump_json(records: list[dict], path: str) -> None:
    payload = {
        "status": "ok",
        "totalResults": len(records),
        "articles": records,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False, default=str)
    print(f"JSON written -> {path}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Scrape a single news source.")
    ap.add_argument("-s", "--source", required=True,
                    help="cnn | bbc | aljazeera | yahoo_tw")
    ap.add_argument("--no-db", action="store_true",
                    help="enrich only; do not write to the database")
    ap.add_argument("--target", type=int, default=None,
                    help="articles to keep per category (default: config)")
    ap.add_argument("--json", default=None,
                    help="also write the collected records to this JSON file")
    args = ap.parse_args()

    spec = get_spec(args.source)
    if args.target is not None:
        spec.target_per_category = args.target

    to_db = not args.no_db
    if to_db and not config.db_dsn():
        print("No DB DSN configured; running with --no-db semantics.")
        to_db = False

    records = run_source(spec, to_db=to_db)

    if args.json:
        _dump_json(records, args.json)


if __name__ == "__main__":
    main()
