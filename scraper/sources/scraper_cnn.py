"""CNN (edition.cnn.com) — English. Category -> section index URLs."""
from __future__ import annotations

import os
import sys

# Allow running this module directly as a script.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.pipeline import SourceSpec, run_source  # noqa: E402

SPEC = SourceSpec(
    key="cnn",
    name="CNN",
    language="en",
    categories={
        "Sport":         ["https://edition.cnn.com/sport"],
        "Health":        ["https://edition.cnn.com/health"],
        "Travel":        ["https://edition.cnn.com/travel"],
        "Business":      ["https://edition.cnn.com/business"],
        "World":         ["https://edition.cnn.com/world"],
        "Politics":      ["https://edition.cnn.com/politics"],
        "Entertainment": ["https://edition.cnn.com/entertainment", "https://edition.cnn.com/style"],
        "Science":       ["https://edition.cnn.com/science"],
    },
)

if __name__ == "__main__":
    run_source(SPEC)
