# NewsAgg Scraper

Transformer-enriched news scraper. Refactored from the monolithic
`server/scraping/scraper4.py` (CPU/local) and `scraper5.py` (Colab/GPU) into a
modular `core/` + `sources/` package.

## Layout

```
scraper/
├── core/
│   ├── config.py      env loading, constants, category labels, thresholds
│   ├── cleaner.py     domain/URL helpers, article-URL patterns, freshness
│   ├── http.py        rate-limited session, crawling, Playwright render
│   ├── extract.py     OG / JSON-LD / video / related / author extraction
│   ├── nlp.py         HF models: sentiment, NER, toxicity, zero-shot, readability
│   ├── summarizer.py  AI summary (BART abstractive + extractive fallback)
│   ├── translator.py  Gemini → Lingva translate (Yahoo TW → EN index)
│   ├── db.py          NeonDB upsert (LIVE schema) + canonical dedup
│   └── pipeline.py    enrich_article + run_source orchestration
├── sources/
│   ├── scraper_cnn.py        English
│   ├── scraper_bbc.py        English
│   ├── scraper_aljazeera.py  English
│   └── scraper_yahoo_tw.py   zh-TW, Playwright, section→topic mapping
├── run_all.py         every source, sequential (used by GitHub Actions)
├── run_single.py      python run_single.py --source cnn
├── cleanup.py         delete articles >45 days AND not protected/bookmarked
└── requirements.txt
```

## Setup

```bash
pip install -r requirements.txt
playwright install chromium        # only needed for Yahoo TW
```

Credentials are read (in order of precedence) from the real environment, then
`scraper/.env`, then `server/.env`:

```env
NEONDB_URL=postgresql://...      # also accepts DATABASE_URL / NEON_DSN
HF_TOKEN=                         # optional — models are public
GEMINI_API_KEY=                   # optional — translator falls back to Lingva
```

## Usage

```bash
python run_single.py --source cnn            # one source → live DB
python run_single.py -s yahoo_tw --no-db     # enrich only, no DB write
python run_single.py -s bbc --target 25 --json bbc.json
python run_all.py                            # all sources → live DB
python cleanup.py                            # dry run
python cleanup.py --commit                   # actually delete stale rows
```

## Notes

- **Live DB schema is authoritative.** `core/db.py` writes the existing
  NeonDB shape (text `id`/`source_id`, `authors` table, `sentiment_polarity`
  + `sentiment_pos/neu/neg`, `ai_relevance`, JSONB `keywords/entities/images`).
  Do **not** swap it for CLAUDE.md's UUID / `sentiment_prob_*` schema.
- Models load lazily and use the GPU automatically when `torch.cuda` is
  available, otherwise CPU.
- Dedup: articles already present (by `canonical_url`) are skipped before
  enrichment; `insert_article` also upserts via `ON CONFLICT (canonical_url)`.
