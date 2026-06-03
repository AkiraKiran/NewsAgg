"""NewsAgg scraper core package.

Refactored from the monolithic ``server/scraping/scraper4.py`` (CPU/local)
and ``scraper5.py`` (Colab/GPU). The two files were ~90% duplicate; this
package unifies them:

    * GPU auto-detection (was scraper5's ``device=DEVICE``)
    * ``.env`` loading from server/ and scraper/ (was scraper4)
    * lazy model loading so light tools (cleanup.py) never import torch

Module map:
    config      shared constants, env loading, category labels, thresholds
    cleaner     domain/URL helpers, article-URL patterns, freshness, dedup
    http        rate-limited session, candidate crawling, playwright render
    extract     OG / JSON-LD / video / related / author HTML extraction
    nlp         HF models — sentiment, NER, toxicity, zero-shot, readability
    summarizer  AI summary (BART abstractive + extractive fallback)
    translator  Gemini -> Lingva translate (Yahoo TW -> EN index)
    db          NeonDB connect + upsert (LIVE schema) + canonical dedup
    pipeline    enrich_article + run_source orchestration
"""
