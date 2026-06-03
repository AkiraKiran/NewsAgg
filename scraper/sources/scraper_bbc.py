"""BBC (bbc.com) — English. Category -> section index URLs."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.pipeline import SourceSpec, run_source  # noqa: E402

SPEC = SourceSpec(
    key="bbc",
    name="BBC",
    language="en",
    categories={
        "Sport":         ["https://www.bbc.com/sport"],
        "Health":        ["https://www.bbc.com/future"],
        "Travel":        ["https://www.bbc.com/travel"],
        "Business":      ["https://www.bbc.com/business"],
        "World":         ["https://www.bbc.com/news/world"],
        "Politics":      ["https://www.bbc.com/news/politics"],
        "Entertainment": ["https://www.bbc.com/arts"],
        "Science":       ["https://www.bbc.com/technology"],
    },
)

if __name__ == "__main__":
    run_source(SPEC)
