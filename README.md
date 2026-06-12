# NewsAgg

NewsAgg is a news aggregation platform with transformer-based sentiment analytics, an X-style three-column UI, a social posts feed, and a per-article AI chat.

## Architecture

```text
scraper/   Python — scrapes CNN / BBC / Al Jazeera / Yahoo TW, enriches with
           multilingual NLP (XLM-R sentiment, FinBERT for English business news,
           XLM-R NER, zero-shot topic, readability, toxicity) and upserts into
           PostgreSQL (Neon).
server/    Express + TypeScript API (port 3001) — articles, stats, markets,
           quotes, auth (email + Google), account, bookmarks, posts, translate
           (Gemini→Lingva fallback), AI chat (Groq, multi-turn).
client/    React 18 + Vite + Tailwind v4 + React Query (port 5173) — X-style
           shell: NavRail · centre feed (filter-aware hero carousel + infinite
           list) · right rail (Insights analytics | Pulse posts+quotes feed).
```

The live database schema is authoritative (see `server/src/db/migrations/000_init_live_schema.sql`): `articles.id` is a TEXT sha256[:16] of the canonical URL, `sources.id` is a TEXT slug (`cnn`, `bbc`, …), `users.id` is an integer identity. Migrations are additive SQL files under `server/src/db/migrations/`, applied with `node scripts/migrate.mjs <file>.sql` from `server/`.

## Running locally

Backend (needs `server/.env` — see CLAUDE.md for the variable list):

```powershell
cd server
npm install --legacy-peer-deps
npm run build
npm start
```

Frontend:

```powershell
cd client
npm install
npm start
```

Scraper (reads `server/.env` automatically; Yahoo TW needs Playwright Chromium):

```powershell
cd scraper
pip install -r requirements.txt
python run_all.py --target 15
```

Docker: `docker compose up -d --build` runs server + client; the scraper is an opt-in profile (`docker compose --profile scraper up scraper`).

## API surface (selected)

```text
GET  /api/news-from-db?category=&source=&sentiment=&q=&sort=rank|latest&page=&pageSize=&fields=summary
GET  /api/articles/:id            GET  /api/articles/:id/translate?lang=
GET  /api/stats/overview          GET  /api/stats/trending        GET  /api/stats/business-trend
GET  /api/markets/summary         GET  /api/quotes/random|list
POST /api/chat                    { message, articleContent, lang, messages? }  → multi-turn Groq
POST /auth/register|login|google  GET/PATCH/PUT/DELETE /api/account/...          [Bearer]
GET/POST /bookmarks               GET/POST/DELETE /api/posts (+ /:id/like)       [Bearer for writes]
```

## Conventions

- One accent identity: cyan→pink brand gradient (`--brand*` tokens in `client/src/styles/tokens.css`); never name a custom token `--accent` — shadcn's `theme.css` owns that name and is imported later.
- All UI strings go through `client/src/app/i18n/translations.ts` (en / id / zh-CN / zh-TW).
- Server state lives in React Query hooks (`client/src/app/hooks/`); AppContext holds UI + identity only.
- The posts feature is gated by `POSTS_ENABLED` in `client/src/app/constants/index.ts`.

See `CLAUDE.md` for the full phase-by-phase execution log, environment variables and operational runbooks.
