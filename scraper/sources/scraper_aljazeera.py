"""Al Jazeera (aljazeera.com) — English. Category -> section index URLs.

Al Jazeera English has no native Politics / Travel / Entertainment sections,
so those topics are omitted (matches the original scraper coverage).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.pipeline import SourceSpec, run_source  # noqa: E402

SPEC = SourceSpec(
    key="aljazeera",
    name="Al Jazeera",
    language="en",
    categories={
        "Sport":    ["https://www.aljazeera.com/sports/"],
        "Health":   ["https://www.aljazeera.com/tag/health/"],
        "Business": ["https://www.aljazeera.com/economy/"],
        "World":    ["https://www.aljazeera.com/news/"],
        "Science":  ["https://www.aljazeera.com/tag/science-and-technology/"],
    },
)

if __name__ == "__main__":
    run_source(SPEC)
