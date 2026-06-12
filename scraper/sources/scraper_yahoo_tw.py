"""Yahoo TW (tw.news.yahoo.com) — zh-TW, JS-rendered (Playwright).

CLAUDE.md feature 4. Yahoo TW renders content client-side, so this source sets
``use_playwright=True``. Sections come pre-categorised, so we trust the
section -> topic mapping and skip the zero-shot relevance filter.

Topic mapping: CLAUDE.md specifies lowercase EN topics (政治->politics, ...),
but the LIVE DB stores Title-case topics shared with CNN/BBC/AJ
(Business/Sport/World/Science/...). To keep the frontend topic filter
consistent, Chinese sections are mapped onto that existing vocabulary:

    政治 Politics | 財經 Business | 體育 Sport | 科技 Science
    娛樂 Entertainment | 社會 World | 國際 World

NOTE: Yahoo TW section paths change periodically — verify these URLs if a
section returns no candidates. Requires the playwright package with the
Chromium browser installed.
"""
from __future__ import annotations

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.pipeline import SourceSpec, run_source  # noqa: E402

# Yahoo TW-specific boilerplate lines (on top of the multilingual core set in
# core/cleaner.py): promo boxes ◤...◢, 👉 call-to-action links, Yahoo house ads.
_YAHOO_BOILERPLATE = [
    re.compile(r"^◤.*◢$"),
    re.compile(r"^👉.*"),
    re.compile(r"^【更多.{0,24}】.*"),
    re.compile(r"^Yahoo奇摩.*"),
    re.compile(r"^最夯影音.*"),
    re.compile(r"^今日推薦影音$"),
]

# Chinese section -> (live Title-case topic, index URL). Kept here for clarity;
# folded into the EN-topic-keyed `categories` dict below.
_SECTIONS = {
    "政治": ("Politics",      "https://tw.news.yahoo.com/politics"),
    "財經": ("Business",      "https://tw.news.yahoo.com/finance"),
    "體育": ("Sport",         "https://tw.news.yahoo.com/sports"),
    "科技": ("Science",       "https://tw.news.yahoo.com/technology"),
    "娛樂": ("Entertainment", "https://tw.news.yahoo.com/entertainment"),
    "社會": ("World",         "https://tw.news.yahoo.com/society"),
    "國際": ("World",         "https://tw.news.yahoo.com/world"),
}


def _build_categories() -> dict[str, list[str]]:
    cats: dict[str, list[str]] = {}
    for _zh, (topic, url) in _SECTIONS.items():
        cats.setdefault(topic, []).append(url)
    return cats


SPEC = SourceSpec(
    key="yahoo_tw",
    name="Yahoo TW",
    language="zh-TW",
    categories=_build_categories(),
    use_playwright=True,
    skip_zero_shot=True,
    content_selectors=[".caas-body"],     # Yahoo's article body container
    boilerplate_extra=_YAHOO_BOILERPLATE,
)

if __name__ == "__main__":
    run_source(SPEC)
