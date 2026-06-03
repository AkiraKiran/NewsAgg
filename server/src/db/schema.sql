CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  country VARCHAR(10),
  language VARCHAR(10) DEFAULT 'en',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  source_id INTEGER REFERENCES sources(id),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  ai_summary TEXT,
  author VARCHAR(255),
  published_at TIMESTAMPTZ,
  modified_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Sentiment
  sentiment_type VARCHAR(20) CHECK (sentiment_type IN ('positive','neutral','negative')),
  sentiment_score FLOAT,
  sentiment_comparative FLOAT,
  sentiment_prob_positive FLOAT,
  sentiment_prob_neutral FLOAT,
  sentiment_prob_negative FLOAT,
  sentiment_model VARCHAR(255),

  -- Toxicity
  toxicity_label VARCHAR(50),
  toxicity_score FLOAT,

  -- Topic / AI
  topic VARCHAR(100),
  section VARCHAR(100),
  ai_top_label VARCHAR(255),
  ai_relevance FLOAT,
  ai_label_scores JSONB,

  -- Readability
  word_count INTEGER,
  reading_time_min INTEGER,
  flesch_score FLOAT,
  flesch_kincaid FLOAT,
  smog_index FLOAT,

  -- Media
  url_to_image TEXT,
  video_url TEXT,
  images JSONB DEFAULT '[]',
  related_urls JSONB DEFAULT '[]',

  -- Metadata
  keywords TEXT[] DEFAULT '{}',
  meta_tags TEXT[] DEFAULT '{}',
  entities JSONB DEFAULT '{"persons":[],"organizations":[],"locations":[],"misc":[]}',
  is_premium BOOLEAN DEFAULT FALSE,
  is_accessible_free BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic);
CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles(sentiment_type);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_keywords ON articles USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
