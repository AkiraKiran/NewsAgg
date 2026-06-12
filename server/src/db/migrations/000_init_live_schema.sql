-- 000_init_live_schema.sql — bootstrap for a fresh/empty NeonDB.
-- Recreates the LIVE schema every consumer (TS server routes, Python scraper
-- core/db.py) already speaks: articles.id TEXT sha256[:16] of canonical_url,
-- sources.id TEXT ('cnn'/'bbc'/...), users.id integer identity with a
-- `password` column. This is intentionally NOT the aspirational UUID schema
-- from the bottom of CLAUDE.md.
-- The `translations` table is absent on purpose: routes/translate.ts creates
-- it lazily on first use. Posts tables arrive in 001_posts.sql (F7).
-- Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS sources (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  domain     TEXT,
  country    TEXT,
  language   TEXT,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- author_url is the upsert key in scraper core/db.py; UNIQUE allows multiple
-- NULLs, matching the old live behavior for author-less articles.
CREATE TABLE IF NOT EXISTS authors (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT,
  author_url TEXT UNIQUE,
  source_id  TEXT REFERENCES sources(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id                 TEXT PRIMARY KEY,
  url                TEXT NOT NULL,
  canonical_url      TEXT UNIQUE NOT NULL,
  source_id          TEXT REFERENCES sources(id),
  author_id          BIGINT REFERENCES authors(id),
  title              TEXT NOT NULL,
  description        TEXT,
  content            TEXT,
  ai_summary         TEXT,
  url_to_image       TEXT,
  video_url          TEXT,
  topic              TEXT,
  section            TEXT,
  og_type            TEXT,
  language           TEXT DEFAULT 'en',
  published_at       TIMESTAMPTZ,
  modified_at        TIMESTAMPTZ,
  scraped_at         TIMESTAMPTZ,
  sentiment_type     TEXT,
  sentiment_score    DOUBLE PRECISION,
  sentiment_polarity DOUBLE PRECISION,
  sentiment_pos      DOUBLE PRECISION,
  sentiment_neu      DOUBLE PRECISION,
  sentiment_neg      DOUBLE PRECISION,
  sentiment_model    TEXT,
  toxicity_label     TEXT,
  toxicity_score     DOUBLE PRECISION,
  word_count         INTEGER,
  reading_time_min   INTEGER,
  flesch_score       DOUBLE PRECISION,
  flesch_kincaid     DOUBLE PRECISION,
  smog_index         DOUBLE PRECISION,
  ai_relevance       DOUBLE PRECISION,
  ai_top_label       TEXT,
  is_premium         BOOLEAN,
  is_accessible_free BOOLEAN,
  keywords           JSONB NOT NULL DEFAULT '[]',
  entities           JSONB NOT NULL DEFAULT '{}',
  images             JSONB NOT NULL DEFAULT '[]',
  related_urls       JSONB NOT NULL DEFAULT '[]',
  og_data            JSONB NOT NULL DEFAULT '{}',
  ai_label_scores    JSONB NOT NULL DEFAULT '{}',
  meta_tags          JSONB NOT NULL DEFAULT '[]',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_topic     ON articles (topic);
CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles (sentiment_type);
CREATE INDEX IF NOT EXISTS idx_articles_source    ON articles (source_id);
CREATE INDEX IF NOT EXISTS idx_articles_keywords  ON articles USING GIN (keywords);

-- avatar + last_login included up front so the account feature (F6) needs no
-- ALTER on this fresh database.
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  username   TEXT UNIQUE,
  password   TEXT,
  avatar     TEXT,
  google_id  TEXT,
  role       TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Flat article_* copies (no FK to articles): a bookmark must outlive article
-- cleanup, and the card renders from these columns alone.
CREATE TABLE IF NOT EXISTS bookmarks (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id    TEXT NOT NULL,
  article_title TEXT,
  article_url   TEXT,
  url_to_image  TEXT,
  source_name   TEXT,
  topic         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id);
