"""AI summary: BART abstractive teaser with an extractive fallback.

The summariser pipeline is optional — some transformers builds drop the
``summarization`` task, and CPU-only environments may not want to load BART.
On any failure we fall back to the first few sentences. Lazy-loaded.
"""
from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Optional

from core import config
from core import nlp

_log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _summariser():
    """Load BART once; return None (cached) if the task is unavailable."""
    try:
        from transformers import pipeline
        return pipeline("summarization", model=config.MODELS["summarizer"],
                        truncation=True, device=nlp.device())
    except Exception as e:                         # noqa: BLE001
        _log.warning("Summariser unavailable, using extractive fallback: %s", e)
        return None


def build_ai_summary(text: str, language: str = "en") -> Optional[str]:
    """BART abstractive teaser for English; extractive first sentences for
    everything else (BART emits garbage on non-EN, and CJK text has no
    whitespace words — the old word-count gate silently skipped zh entirely)."""
    chunk = text[:1024]
    is_en = (language or "en").startswith("en")

    if is_en:
        if len(chunk.split()) <= 50:
            return None
        pipe = _summariser()
        if pipe is not None:
            try:
                out = pipe(chunk, max_length=80, min_length=30, do_sample=False)
                return out[0]["summary_text"]
            except Exception:
                pass
    elif len(chunk) <= 80:        # CJK gate by characters, not words
        return None

    # Extractive fallback — first 3 sentences (CJK-aware split), capped.
    sentences = [s for s in re.split(r"(?<=[.!?。！？])\s*", chunk.strip()) if s]
    fallback = " ".join(sentences[:3]).strip()
    if len(fallback) > 420:
        fallback = fallback[:420].rsplit(" ", 1)[0] + "..."
    return fallback or None
