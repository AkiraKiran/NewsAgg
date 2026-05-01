# ══════════════════════════════════════════════════════════════════
#  UI/UX CLAUDE PROMPT  — paste this into Claude (or Copilot)
# ══════════════════════════════════════════════════════════════════

"""
CONTEXT
-------
This is a React + TypeScript + Tailwind + Framer Motion news aggregator.
The scraper now produces richer articles with these NEW fields:

NEW FIELDS PER ARTICLE:
  id                 — sha256 hash (use as React key, URL slug)
  canonical_url      — for dedup + sharing
  author_url         — link to author profile page
  ai_summary         — BART-generated abstract (80 words max)
  images             — [{url, alt, caption, is_primary}, ...] (multiple images)
  video_url          — embed URL if video exists
  modified_at        — last edited date
  scraped_at         — when we got it
  language           — ISO code e.g. "en", "ar"
  section            — sub-section e.g. "Football", "Markets"
  meta_tags          — ["climate", "Biden", ...] from og/meta
  og                 — {title, description, site_name, locale, twitter_card, twitter_site}
  is_premium         — boolean, paywalled
  is_accessible_free — boolean
  readability        — {word_count, reading_time_min, flesch_score, flesch_kincaid, smog_index}
  toxicity           — {label:"non-toxic"|"toxic", score:0.0-1.0}
  related_urls       — [url, url, ...] up to 10 same-site related articles
  ai_relevance       — 0.0-1.0 how strongly AI matched to category
  ai_top_label       — e.g. "sports"
  ai_label_scores    — {sports:0.92, politics:0.03, ...}
  entities           — {persons:[], organizations:[], locations:[], misc:[]}
  sentiment.model    — "general" | "finance"

CATEGORIES EXPANDED (8 now, was 3):
  Sport, Health, Travel, Business, World, Politics, Entertainment, Science

SOURCE EXPANDED (was only CNN):
  CNN, BBC, Al Jazeera (colour code each source)

TASKS — update the UI to use these new fields:
────────────────────────────────────────────────

1. NEWSCARD COMPONENT  (client/src/app/components/NewsCard.tsx)
   - Add "Reading time" badge: show readability.reading_time_min + "min read"
   - Show source logo/favicon next to source name
   - Add 📹 video indicator badge if video_url exists
   - Add 🔒 lock icon + "Premium" badge if is_premium === true
   - Show section as a sub-tag below category badge (e.g. "Football" under "Sport")
   - Highlight toxicity: if toxicity.label === "toxic" show ⚠️ warning pill
   - Use id as the Link key instead of url (shorter, stable)

2. ARTICLE PAGE  (client/src/app/pages/ArticlePage.tsx)
   - Hero: show video_url with embedded <video> or iframe if present, else image
   - Gallery: render images array as a scrollable thumbnail strip below hero
   - Author: make author name a clickable link to author_url if it exists
   - Add AI Summary card at the top of the article sidebar:
       Title "🤖 AI Summary" with ai_summary text in a soft yellow/amber panel
   - Add Readability card in sidebar:
       Word count, reading time, Flesch score visualised as a progress bar
       Label the Flesch score: <30="Very Hard", 30-50="Hard", 50-60="Medium", 60-70="Easy", >70="Easy Read"
   - Replace old "Emotions" panel with REAL toxicity indicator:
       Circular gauge showing toxicity.score (0=green → 1=red)
   - Add "Meta Tags" chip list from meta_tags array
   - Add "Source info" panel: show og.site_name, og.locale, og.twitter_site, source country flag emoji
   - Entities panel: add "misc" group to existing persons/orgs/locations
   - Show ai_label_scores as a horizontal bar chart (topic confidence bars)
   - Add "Related Articles" section at the bottom using related_urls:
       Render up to 5 as compact link cards (fetch titles from articles array by URL match)
   - Add modified_at display: "Updated: <date>" below published_at if different

3. HEADER  (client/src/app/components/Header.tsx)
   - Category dropdown now has 8 categories (add Health, Travel, World, Entertainment, Science)
   - Add source filter dropdown: All Sources | CNN | BBC | Al Jazeera
     (store in AppContext as selectedSource, filter newsAPI accordingly)
   - Add language filter: All | English only (filter by article.language === "en")

4. SENTIMENTPANEL  (client/src/app/components/SentimentPanel.tsx)
   - Add a new "Toxicity Overview" widget at the bottom:
       Count toxic vs non-toxic articles, show as a small donut chart
   - Add "Top Entities" section: aggregate entities.persons + entities.organizations
     across all articles and show top 10 as a ranked list
   - Add "AI Confidence" metric: average ai_relevance across visible articles

5. NEWSAPI SERVICE  (client/src/app/services/newsAPI.ts)
   - Update NewsArticle TypeScript interface to include all new fields
   - Add filterBySource(articles, sourceId) helper
   - Add filterByLanguage(articles, lang) helper  
   - Update NewsCategoryFilter type to include all 8 categories
   - Add getSources() helper returning unique sources from articles
   - Add getTopEntities(limit, category) helper — aggregates entities.persons + organizations

6. APPCCONTEXT  (client/src/app/contexts/AppContext.tsx)
   - Add selectedSource: string | 'all'  (default 'all')
   - Add setSelectedSource
   - Add selectedLanguage: string | 'all' (default 'all')
   - Add setSelectedLanguage

7. HERO CAROUSEL  (client/src/app/components/HeroCarousel.tsx)
   - Prefer articles with video_url for hero slots
   - Show ai_summary as subtitle instead of description (shorter, cleaner)
   - Add source badge (CNN / BBC / Al Jazeera) with distinct color per source

8. TRANSLATIONS  (client/src/app/i18n/translations.ts)
   - Add keys: health, travel, world, entertainment, science,
               readingTime, aiSummary, relatedArticles, premium,
               toxicity, sourceCnn, sourceBbc, sourceAljazeera,
               allSources, wordCount, flesch

9. CONSTANTS  (client/src/app/constants/index.ts)
   - Update CATEGORIES array to include all 8
   - Add SOURCES constant: [{id:'cnn',name:'CNN',color:'#cc0000'}, ...]
   - Add SOURCE_COLORS map for badge styling

STYLE GUIDELINES
────────────────
- CNN badge: bg-red-700
- BBC badge: bg-red-600  (different shade)
- Al Jazeera badge: bg-gray-800
- Health category: bg-emerald-600
- Travel category: bg-teal-500
- World category: bg-violet-600
- Entertainment category: bg-pink-500
- Science category: bg-blue-600
- Premium lock: bg-amber-500 text-black
- Toxic warning: bg-rose-500
- AI Summary panel: bg-amber-50 border-amber-200 dark:bg-amber-900/20
- Video badge: bg-cyan-500 with play icon
- Reading time: text-slate-500 text-xs with ClockIcon

Keep all existing design tokens (isDark, panelBase, mutedText) — just extend.
Do NOT break existing functionality. All new fields are optional — guard with optional chaining.
"""


# ══════════════════════════════════════════════════════════════════
#  PostgreSQL — IS IT GOOD?
# ══════════════════════════════════════════════════════════════════
"""
YES. PostgreSQL is the right choice. Reasons:

1. JSONB columns — store keywords, entities, images, og as flexible JSON
   but still queryable with GIN indexes. Perfect for your variable article data.

2. pg_trgm extension — fast LIKE/similarity search on title + content.
   Your search bar will be instant.

3. Full-text search built-in — ts_vector + ts_rank, no Elasticsearch needed
   for MVP.

4. pgvector extension (optional, install separately) — store sentence
   embeddings per article → "similar articles" feature, semantic search.

5. Row-level timestamps (published_at, scraped_at) + BRIN indexes → fast
   time-range queries ("last 24h headlines").

6. UPSERT (ON CONFLICT DO UPDATE) — run scraper on cron, no duplicates.

RECOMMENDED STACK:
  Database:  PostgreSQL 16 (Supabase free tier = easiest, already has
             pgvector + REST API auto-generated)
  ORM:       Drizzle ORM (TypeScript, lightweight) or Prisma
  Adapter:   psycopg2 (Python scraper) + pg (Node.js server)
  Hosting:   Supabase (free) → Railway → Neon (serverless Postgres)

ALTERNATIVE for pure JSON: MongoDB Atlas free tier works too but you lose
the power of relational joins and pgvector.
"""


# ══════════════════════════════════════════════════════════════════
#  AI TOOLS RECOMMENDATION (GitHub Student Pack / VS Code)
# ══════════════════════════════════════════════════════════════════
"""
BEST TOOLS FOR YOUR SETUP:

1. GITHUB COPILOT (you already have it)
   - Best for: autocomplete inside VS Code while writing scraper/React code
   - Use Copilot Chat (Ctrl+I) to ask "write a Drizzle schema for this JSON"
   - Models available in Copilot Chat: GPT-4o, Claude Sonnet 4.5, o3-mini
   - TIP: Select a function → right-click → "Copilot: Explain" to debug
     complex scraper logic

2. CLAUDE claude.ai (this chat) ← USE FOR ARCHITECTURE + PROMPTS
   - Best for: long-context code review, UI/UX redesign prompts,
     database schema design, the whole-file analysis you're doing now
   - Claude sees your full codebase context better than Copilot

3. CURSOR IDE (free tier, student-friendly)
   - Drop-in VS Code replacement with Composer (multi-file edits)
   - Best for: "update all 8 components at once for new fields"
   - Composer = paste the UI/UX prompt above → it edits ALL files at once

4. CODEIUM (free, no student pack needed)
   - Faster autocomplete than Copilot for Python scraper code
   - Good for Hugging Face pipeline boilerplate

5. HUGGING FACE SPACES (free GPU inference)
   - Run your scraper on H100 GPU for free (ZeroGPU quota)
   - Avoid running heavy models (BART, mDeBERTa) locally
   - Deploy as a Gradio app → trigger scraper via HTTP

WORKFLOW RECOMMENDATION:
  VS Code + Copilot (daily coding)
  ↓
  Paste big changes into Claude (architecture / full-file edits)  
  ↓
  Cursor Composer (multi-file UI updates from the prompt above)
  ↓
  Hugging Face Spaces (GPU inference for scraper)
  ↓
  Supabase (PostgreSQL + auto REST API)

FOR THE SCRAPER SPECIFICALLY — best model upgrades available free:
  sentiment:  cardiffnlp/twitter-roberta-base-sentiment-latest ✓ (keep)
  finance:    ProsusAI/finbert ✓ (keep)
  zero-shot:  MoritzLaurer/mDeBERTa-v3-base-mnli-xnli ✓ (keep)
  ner:        dslim/bert-large-NER (upgrade from bert-base for accuracy)
  summary:    facebook/bart-large-cnn ✓ (keep, or use google/pegasus-cnn_dailymail)
  toxicity:   unitary/toxic-bert ✓ (keep)
  embeddings: sentence-transformers/all-MiniLM-L6-v2 (ADD for pgvector)
  language:   papluca/xlm-roberta-base-language-detection (more accurate than langdetect)
"""