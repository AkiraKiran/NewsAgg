"""Source registry. Each module defines a ``SPEC`` (core.pipeline.SourceSpec)."""
from __future__ import annotations

from core.pipeline import SourceSpec

from . import scraper_aljazeera, scraper_bbc, scraper_cnn, scraper_yahoo_tw

REGISTRY: dict[str, SourceSpec] = {
    scraper_cnn.SPEC.key: scraper_cnn.SPEC,
    scraper_bbc.SPEC.key: scraper_bbc.SPEC,
    scraper_aljazeera.SPEC.key: scraper_aljazeera.SPEC,
    scraper_yahoo_tw.SPEC.key: scraper_yahoo_tw.SPEC,
}

# Order used by run_all (English wires first, JS-rendered Yahoo last).
ORDER = ["cnn", "bbc", "aljazeera", "yahoo_tw"]


def get_spec(key: str) -> SourceSpec:
    try:
        return REGISTRY[key]
    except KeyError:
        valid = ", ".join(REGISTRY)
        raise SystemExit(f"Unknown source '{key}'. Valid: {valid}")


def all_specs() -> list[SourceSpec]:
    return [REGISTRY[k] for k in ORDER if k in REGISTRY]
