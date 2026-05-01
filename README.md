# NewsAgg

NewsAgg is a news aggregation project with three distinct layers:

1. `server/scraping/`: Python scrapers that collect, filter, enrich, and score articles.
2. `client/`: a React + Vite frontend that reads the generated dataset from JSON.
3. `server/`: an Express + MongoDB backend for NewsAPI proxying, comments, view tracking, and simple engagement stats.

The current primary data path is:

```text
server/scraping/scraper4.py
  -> client/src/app/data/news_data_cnn.json
  -> client/src/app/services/newsAPI.ts
  -> React pages/components in client/src/app/
```

The current frontend does not depend on `server/server.js` for article content. It reads the scraper-generated JSON directly. The Express server is a separate backend path that can be used for comments, views, and NewsAPI-backed endpoints.

## Architecture Summary

```text
                +------------------------------+
                |   server/scraping/*.py       |
                |   crawl + AI enrichment      |
                +--------------+---------------+
                               |
                               v
          +---------------------------------------------+
          | client/src/app/data/news_data_cnn.json      |
          | static dataset consumed by the frontend      |
          +----------------------+----------------------+
                                 |
                                 v
          +---------------------------------------------+
          | client/src/app/services/newsAPI.ts          |
          | normalization + filtering + derived views   |
          +----------------------+----------------------+
                                 |
                                 v
          +---------------------------------------------+
          | client/src/app/pages + components           |
          | Home / TopHeadlines / Country / Article     |
          +---------------------------------------------+

Separately:

server/server.js
  -> NewsAPI proxy endpoints
  -> MongoDB comments
  -> MongoDB view tracking
  -> basic engagement scoring
```

## Repository Map

This is the working structure that matters for development. Generated folders are called out separately.

```text
.
|-- README.md
|-- .gitignore
|-- package-lock.json
|-- client/
|   |-- package.json
|   |-- vite.config.ts
|   |-- index.html
|   |-- .env.local
|   |-- src/
|   |   |-- main.tsx
|   |   |-- styles/
|   |   `-- app/
|   |       |-- App.tsx
|   |       |-- routes.tsx
|   |       |-- constants/
|   |       |-- contexts/
|   |       |-- data/
|   |       |-- services/
|   |       |-- pages/
|   |       |-- components/
|   |       `-- i18n/
|   `-- dist/                  # build output
`-- server/
    |-- package.json
    |-- server.js
    |-- .gitignore
    |-- .env                   # local, user-created
    |-- .hf.env                # local, gitignored
    |-- .hf.env.example
    `-- scraping/
        |-- scraper.py
        |-- scraper2.py
        |-- scraper3.py
        |-- scraper4.py
        |-- pip.py
        |-- guide.py
        |-- venv/              # local Python virtualenv
        `-- __pycache__/       # generated Python cache
```

## Folder-by-Folder Guide

### Root

- `README.md`: this document.
- `.gitignore`: root ignore rules, including `.hf.env`.
- `package-lock.json`: root-level npm lockfile is present, but there is no active root `package.json`. Install and run dependencies from `client/` and `server/` separately.

### `client/`

This is the user-facing web application.

- `package.json`: Vite + React app with the UI dependency stack.
- `vite.config.ts`: Vite build/dev config.
- `src/main.tsx`: mounts the app.
- `src/app/App.tsx`: wraps the router in `AppProvider`.
- `src/app/routes.tsx`: declares the app routes:
  - `/`
  - `/top-headlines`
  - `/country/:iso`
  - `/article/:id`
- `src/app/contexts/AppContext.tsx`: global UI state for theme, language, category filter, search state, and drawers.
- `src/app/constants/index.ts`: shared category and country constants. The synchronized interface now uses 8 categories:
  - `sport`
  - `health`
  - `travel`
  - `business`
  - `world`
  - `politics`
  - `entertainment`
  - `science`
- `src/app/data/news_data_cnn.json`: generated dataset written by `scraper4.py`. This is the main content source for the frontend.
- `src/app/data/mockNews.ts`: older mock-data file. It is not the active runtime data source.
- `src/app/services/newsAPI.ts`: the frontend data adapter. It normalizes the raw scraper JSON into stable TypeScript shapes and exposes helpers for filtering, lookup, sentiment distribution, trending keywords, and simulated live engagement.
- `src/app/pages/`: route-level screens:
  - `Root.tsx`
  - `Home.tsx`
  - `TopHeadlines.tsx`
  - `CountryPage.tsx`
  - `ArticlePage.tsx`
  - `NotFound.tsx`
- `src/app/components/`: reusable feature components such as:
  - `Header`
  - `HeroCarousel`
  - `NewsGrid`
  - `NewsCard`
  - `SentimentPanel`
  - `ArticleSentimentPanel`
  - `ProfileSidebar`
  - `AccountDrawer`
- `src/app/components/ui/`: UI primitives and wrappers used by the feature components.
- `dist/`: production build output from `npm run build`.

### `server/`

This is the Node/Express backend.

- `server.js`: Express app with:
  - NewsAPI proxy endpoints
  - comment creation and retrieval
  - comment likes
  - view tracking
  - article stats
- `package.json`: backend runtime dependencies.
- `.env`: expected local backend environment file for NewsAPI and MongoDB.
- `.hf.env`: local Hugging Face token file for Python scrapers. This file is gitignored.
- `.hf.env.example`: tracked template for `.hf.env`.

### `server/scraping/`

This is the Python scraping workspace.

- `scraper4.py`: the current primary scraper and enrichment pipeline. This is the file the frontend is synchronized to.
- `scraper3.py`: older multi-source iteration, still useful as reference.
- `scraper2.py`: earlier CNN-focused version with simpler category coverage and output.
- `scraper.py`: earliest prototype version.
- `pip.py`: install notes for scraper dependencies.
- `guide.py`: currently empty placeholder.
- `venv/`: local virtual environment.

## Which Files Are Current vs Legacy

| Path | Role | Current Status |
| --- | --- | --- |
| `server/scraping/scraper4.py` | main scrape + AI enrichment pipeline | Active |
| `client/src/app/services/newsAPI.ts` | frontend adapter for scraper output | Active |
| `client/src/app/data/news_data_cnn.json` | generated dataset | Active |
| `server/server.js` | optional backend API, comments, views | Active but not the main article-content path |
| `server/scraping/scraper3.py` | older scraper iteration | Reference / legacy |
| `server/scraping/scraper2.py` | older scraper iteration | Reference / legacy |
| `server/scraping/scraper.py` | earliest prototype | Reference / legacy |
| `client/src/app/data/mockNews.ts` | mock data | Inactive |
| `server/scraping/guide.py` | placeholder | Inactive |

## Environment Files

There are two separate environment scopes under `server/`.

### 1. `server/.env`

Used by `server/server.js`.

Example:

```env
API_KEY=your_newsapi_key
MONGODB_URI=mongodb://localhost:27017/newsagg
PORT=3000
```

### 2. `server/.hf.env`

Used by `server/scraping/scraper3.py` and `server/scraping/scraper4.py`.

Example:

```env
HF_TOKEN=your_huggingface_token
```

Notes:

- `server/.hf.env` is gitignored.
- `server/.hf.env.example` is the tracked template.
- the current scraper code requires `HF_TOKEN` to exist either in `server/.hf.env` or in the process environment.

### 3. `client/.env.local`

This file exists in the client workspace, but the current synchronized frontend flow does not depend on a client-side API base URL for the scraper dataset. The main content path is static JSON import from `client/src/app/data/news_data_cnn.json`.

## Local Setup

### Prerequisites

- Node.js for `client/` and `server/`
- Python 3.x for `server/scraping/`
- a MongoDB instance if you want to run backend comment/view endpoints
- a Hugging Face token because `scraper3.py` and `scraper4.py` load models using `HF_TOKEN`

### Install Frontend Dependencies

```bash
cd client
npm install
```

### Install Backend Dependencies

```bash
cd server
npm install
```

### Create the Python Environment

PowerShell example:

```powershell
py -3 -m venv server/scraping/venv
server\scraping\venv\Scripts\Activate.ps1
pip install newspaper3k lxml_html_clean transformers torch pandas nltk beautifulsoup4 requests langdetect textstat sentencepiece
```

`pip.py` contains rough install notes, but the line above is the practical setup command.

## Running the Project

### A. Run the frontend against the existing generated dataset

```bash
cd client
npm run dev
```

### B. Refresh the dataset from live sources

From the repository root, with the Python environment active:

```bash
python server/scraping/scraper4.py
```

This writes the output file here:

```text
client/src/app/data/news_data_cnn.json
```

After that, the frontend will pick up the refreshed dataset on the next reload.

### C. Run the optional Express backend

```bash
cd server
npm start
```

The backend exposes:

- `GET /everything`
- `GET /top-headlines`
- `GET /country/:iso`
- `POST /comments`
- `GET /comments/:articleUrl`
- `POST /comments/:commentId/like`
- `POST /track-view`
- `GET /stats/:articleUrl`

Important: the current synchronized frontend article flow is not driven by these endpoints. The client-side `newsAPI.ts` now reads local JSON directly.

## End-to-End Workflow

### Workflow 1: Update article content shown in the UI

1. Run `python server/scraping/scraper4.py`.
2. The scraper crawls sources, applies AI filtering, enriches each article, and writes `client/src/app/data/news_data_cnn.json`.
3. `client/src/app/services/newsAPI.ts` normalizes the JSON into frontend types.
4. The pages and components render that normalized data.

### Workflow 2: Browse the app

1. `client/src/main.tsx` mounts the app.
2. `client/src/app/App.tsx` provides `AppContext` and router wiring.
3. `client/src/app/routes.tsx` maps URLs to pages.
4. Route pages request data through `newsAPI.ts`.
5. Components render cards, detail views, sentiment panels, and derived views.

### Workflow 3: Optional backend analytics/comments

1. Start `server/server.js`.
2. Backend connects to MongoDB.
3. Comments and views are stored in Mongo collections.
4. `/stats/:articleUrl` computes a simple engagement score.

This is a separate track from the static scraper dataset.

## `scraper4.py` Pipeline

`server/scraping/scraper4.py` is the main production-like scraper in this repository. Its pipeline is:

1. Load configuration and `HF_TOKEN`.
2. Download required NLTK resources.
3. Load AI models:
   - general sentiment: `cardiffnlp/twitter-roberta-base-sentiment-latest`
   - finance sentiment: `ProsusAI/finbert`
   - zero-shot classifier: `MoritzLaurer/mDeBERTa-v3-base-mnli-xnli`
   - NER: `dslim/bert-base-NER`
   - summarizer: `facebook/bart-large-cnn` with a safe fallback if unavailable
   - toxicity: `unitary/toxic-bert`
4. Crawl category landing pages for candidate article links from CNN, BBC, and Al Jazeera.
5. Keep only likely article URLs from the same source family.
6. Reject obviously stale items using published dates or URL-derived dates when available.
7. Run zero-shot topic filtering so each category keeps articles that actually match the target topic.
8. Enrich each surviving article with:
   - title
   - content
   - description
   - canonical URL
   - author and author URL
   - image/video metadata
   - Open Graph metadata
   - JSON-LD metadata
   - related URLs
   - entities
   - sentiment
   - toxicity
   - readability
   - language
   - keywords
   - AI summary
9. Deduplicate across categories using canonical URL.
10. Export a unified JSON payload for the frontend.
11. Provide optional PostgreSQL schema and upsert helpers at the bottom of the file.

## Data Output Contract

The exported JSON written by `scraper4.py` has this top-level shape:

```json
{
  "status": "ok",
  "totalResults": 0,
  "articles": [],
  "scrapedAt": "ISO timestamp",
  "categories": ["Sport", "Health", "Travel", "Business", "World", "Politics", "Entertainment", "Science"],
  "aiModels": {
    "sentimentGeneral": "...",
    "sentimentFinance": "...",
    "summariser": "...",
    "toxicity": "...",
    "zeroShot": "...",
    "ner": "..."
  }
}
```

Each article contains grouped information across:

- identity: `id`, `url`, `canonical_url`
- source: `source`
- author: `author`, `author_url`
- content: `title`, `description`, `content`, `ai_summary`
- media: `url_to_image`, `images`, `video_url`
- timing: `published_at`, `modified_at`, `scraped_at`
- classification: `topic`, `section`, `meta_tags`, `og_type`, `language`
- sentiment: `type`, `score`, `comparative`, `probabilities`, `model`
- safety: `toxicity`
- retrieval features: `keywords`, `entities`, `related_urls`
- readability: `word_count`, `reading_time_min`, `flesch_score`, `flesch_kincaid`, `smog_index`
- access flags: `is_premium`, `is_accessible_free`
- AI topic scoring: `ai_relevance`, `ai_top_label`, `ai_label_scores`

`client/src/app/services/newsAPI.ts` is responsible for converting that raw snake_case structure into stable frontend types.

## Mathematical and Heuristic Decisions

Important: most numeric choices in `scraper4.py` are engineering heuristics, not benchmark-calibrated research results. They exist to balance precision, recall, UI consistency, and runtime cost.

### 1. Crawl Freshness and Volume

| Decision | Code | Why it exists |
| --- | --- | --- |
| Recency window | `MAX_AGE_DAYS = 60` | Keeps the dataset recent enough for a news UI without being so strict that low-volume categories collapse. |
| Target size | `TARGET_PER_CATEGORY = 50` | Gives the UI a stable per-category shape and enough articles for grids, carousels, and detail-side panels. |
| Oversampling | `CRAWL_MULT = 3` | The crawler expects many raw links to be duplicates, too short, stale, or off-topic. Sampling 3x the target increases the chance of keeping 50 usable records. |
| Per-source quota | `max(20, (TARGET_PER_CATEGORY * CRAWL_MULT) // len(source_urls))` | Keeps crawling distributed across sources while enforcing a minimum candidate volume from each source family. |
| Minimum content length | `MIN_TEXT_LEN = 300` | Filters out very short items that are usually briefs, shells, or pages without enough text for sentiment/readability/NER to be meaningful. |
| Per-domain rate limiting | `RATE_DELAY = 1.2` seconds | Reduces the chance of hammering a source and lowers transient request failures. |

### 2. URL Identity and Deduplication

| Decision | Code | Why it exists |
| --- | --- | --- |
| Stable article ID | `sha256(canonical_url)[:16]` | Produces a deterministic ID that survives reloads and avoids depending on provider-specific IDs. |
| Rough dedup before enrichment | `canon = item["url"]` and `global_seen` | Avoids spending model/runtime cost on duplicate candidates before a full article parse. |
| Final dedup key | `canonical_url` | Canonical URLs are usually the strongest cross-source/permalink identity signal available in scraped news pages. |

### 3. Zero-Shot Topic Filtering

| Decision | Code | Why it exists |
| --- | --- | --- |
| Topic validation threshold | `ZS_THRESHOLD = 0.38` | This is a moderate acceptance floor. It allows some ambiguity while still rejecting obviously wrong articles. A much higher threshold would reduce recall too aggressively on noisy landing pages. |
| Category label lists | `CATEGORY_LABELS[...]` | Expands each category into semantically related labels so the classifier is not forced to match only one literal topic word. |

This step is necessary because source landing pages are noisy. A page like `world` or `business` often contains opinion links, video stubs, newsletters, or unrelated promo blocks. The zero-shot classifier acts as a second-stage relevance filter.

### 4. Sentiment Model Selection

| Decision | Code | Why it exists |
| --- | --- | --- |
| Business uses FinBERT | `SENTIMENT_MODEL_MAP["Business"] = "finance"` | Financial language has domain-specific polarity. Terms like "beat estimates" or "downgrade" are better handled by a finance model than a generic social/news sentiment model. |
| Other categories use RoBERTa | default `"general"` | General news categories fit a general sentiment model better than a finance-specialized one. |

### 5. Sentiment Probability Normalization

The scraper first normalizes raw classifier outputs so they sum to 1:

```text
P'(label) = P(label) / sum(P(all labels))
```

Reason:

- different pipeline outputs can arrive in slightly different list formats
- normalization ensures later comparisons are stable
- the stored probabilities become interpretable as a simple three-class distribution

### 6. Sentiment Classification Rule

The key derived value is:

```text
polarity = P(positive) - P(negative)
```

This yields a signed value in `[-1, 1]`.

Decision rule:

```text
if P(neutral) >= 0.52 and |polarity| <= 0.18:
    label = neutral
elif polarity >= 0.10:
    label = positive
elif polarity <= -0.10:
    label = negative
else:
    label = argmax(probabilities)
```

Why those thresholds exist:

- `NEUTRAL_THRESHOLD = 0.52`
  - Neutral must be more than a coin-flip. This avoids calling mixed articles neutral when the model is only weakly leaning that way.
- `NEUTRAL_POLARITY_CAP = 0.18`
  - Even if neutral is the highest probability, the article should not be called neutral when positive and negative are far apart.
- `POLARITY_MARGIN = 0.10`
  - A small positive-minus-negative difference is not enough to confidently call an article positive or negative. This margin reduces label jitter on mixed or ambiguous pieces.

Stored sentiment fields:

- `type`: final label after the rule above
- `score`: confidence of the chosen label
- `comparative`: signed polarity `P(pos) - P(neg)`
- `probabilities`: normalized three-way distribution

### 7. Truncation Windows for AI Tasks

| Task | Input slice | Reason |
| --- | --- | --- |
| Language detection | `text[:1000]` | First 1000 characters are usually enough to infer language while keeping the operation cheap. |
| NER | `text[:1500]` | Keeps entity extraction bounded while still covering the headline and leading body, which typically contain the main entities. |
| Sentiment | `text[:1500]` | Early paragraphs in news writing usually carry the main framing signal; this reduces cost without requiring full-document inference. |
| Toxicity | `text[:512]` | Matches the practical token limits of the classifier and keeps the safety pass inexpensive. |
| Summary | `text[:1024]` | Gives the summarizer enough context for a teaser-length abstract while keeping generation bounded. |

These windows are runtime-control decisions, not guarantees that the full article sentiment or topic is perfectly captured.

### 8. Keyword Extraction

The keyword function combines three signals:

1. `newspaper3k` keywords weighted by `+3`
2. named-entity tokens weighted by `+2`
3. body-word frequency used as a fallback only when the term is not already covered

This is effectively a simple weighted merge:

```text
keyword_score ~= 3 * newspaper_hits + 2 * entity_hits + 1 * fallback_frequency
```

Notable implementation details:

- stopwords are removed
- terms shorter than 4 characters are ignored
- only the top 30 unique keywords are kept

Reasoning:

- `newspaper3k` keywords are treated as the strongest prior because they are already extractive article-level signals
- entity tokens are strong but noisier, so they get slightly less weight
- raw body frequency is useful as a fallback, but only after the higher-quality sources contribute

### 9. Readability Metrics

`scraper4.py` stores:

- `word_count`
- `reading_time_min`
- `flesch_score`
- `flesch_kincaid`
- `smog_index`

The reading-time formula is:

```text
reading_time_min = max(1, round(word_count / 200))
```

Reasoning:

- `200 words/minute` is a conventional average reading-speed assumption for general prose
- `max(1, ...)` avoids zero-minute output for short articles

The Flesch, Flesch-Kincaid, and SMOG values come directly from `textstat`. They are descriptive indicators, not truth about actual reader comprehension.

### 10. Client-Side Derived Metrics

`client/src/app/services/newsAPI.ts` computes additional derived views from the static dataset.

#### Trending keywords

The client counts occurrences of:

- article keywords
- meta tags

Then sorts by descending count. This is a simple frequency ranking over the current dataset slice, not a time-decayed trend model.

#### Simulated live engagement

`getLiveEngagement()` is synthetic. It is not reading backend analytics.

The logic is:

- build a stable hash from the article ID
- derive deterministic base values for views, likes, and interactions from that hash
- add small `sin()` / `cos()` oscillations using the current timestamp
- sort by `interactions`

Reasoning:

- stable hash: each article gets a consistent identity-based baseline
- sinusoidal perturbation: the UI can feel "live" without a real-time analytics service
- deterministic output: refreshes are visually dynamic but still bounded and reproducible enough for local UI work

This is placeholder behavior for interface richness, not a real measurement system.

### 11. Backend Engagement Metric

In `server/server.js`, the current engagement formula is:

```text
engagement = viewCount + (commentCount * 10)
```

Reasoning:

- raw views are weak interaction
- comments are treated as higher-intent actions
- weighting comments by `10` is a simple heuristic to give discussion more importance than passive traffic

This is intentionally simple and should not be treated as a calibrated ranking model.

## Frontend Data Flow

The client does not consume the raw scraper JSON directly in components. The normalization layer in `client/src/app/services/newsAPI.ts` is important because it:

- accepts snake_case and camelCase variants
- normalizes nullable fields
- converts raw scraper structures into TypeScript interfaces
- filters invalid entries without a recognized topic
- sorts articles by `publishedAt`, then `aiRelevance`
- exposes helper APIs that mimic backend-style calls:
  - `getAllNews()`
  - `getTopHeadlines()`
  - `getCountryHeadlines()`
  - `getArticleById()`
  - `getSentimentDistribution()`
  - `getLatestArticles()`
  - `getTrendingKeywords()`
  - `getLiveEngagement()`

This adapter layer is what keeps the UI synchronized with `scraper4.py` even when the raw payload shape changes.

## Backend Notes

`server/server.js` is currently a separate Node service with MongoDB-backed interaction endpoints. It includes:

- NewsAPI proxy calls through Axios
- `Comment` and `View` Mongoose models
- comment creation and like increments
- per-article view tracking
- engagement summary endpoint

Current caveat:

- `server/server.js` contains a duplicate `mongoose.connect(...)` call near the end of the file. It does not change the README workflow, but it should be cleaned up in code.

## PostgreSQL Helpers in `scraper4.py`

The bottom of `scraper4.py` includes:

- PostgreSQL DDL
- indexes
- `pg_insert_article()`
- `pg_insert_all()`

These helpers are optional and are not automatically used by the current client flow. The active path remains JSON export to `client/src/app/data/news_data_cnn.json`.

## Generated and Local-Only Files

These folders/files are expected during development and should be treated as generated or local:

- `client/node_modules/`
- `client/dist/`
- `client/.vite-dev.out.log`
- `client/.vite-dev.err.log`
- `server/node_modules/`
- `server/.env`
- `server/.hf.env`
- `server/scraping/venv/`
- `server/scraping/__pycache__/`

## Practical Notes

- First scraper run can take several minutes because transformer models are downloaded and loaded.
- `scraper4.py` is the source of truth for the current article schema.
- The frontend is intentionally tolerant of schema drift through `newsAPI.ts`, but changes in `scraper4.py` should still be reviewed together with the client.
- If a hardcoded token was ever committed previously, rotate it and replace it in `server/.hf.env`.

## Recommended Development Order

When changing this project, use this order:

1. Update `server/scraping/scraper4.py` if the data contract changes.
2. Regenerate `client/src/app/data/news_data_cnn.json`.
3. Update `client/src/app/services/newsAPI.ts` if the payload shape changed.
4. Update pages/components that surface the new fields.
5. Run the client and verify the affected views.
6. Only touch `server/server.js` if the backend API path is part of the feature.
