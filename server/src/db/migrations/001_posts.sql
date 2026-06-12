-- F7 posts: short user posts (≤280 chars) with an optional attached article
-- (quote-tweet style) and per-user likes. Additive + idempotent.
-- article FK is SET NULL so cleanup.py can prune old articles without
-- breaking posts ("Article no longer available" card on the client).

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles(id) ON DELETE SET NULL,
  content VARCHAR(280) NOT NULL CHECK (length(btrim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
