"""Shared configuration: env loading, tuning constants, category labels.

Kept deliberately import-cheap — no torch / transformers / nltk here, so
that lightweight entry points (``cleanup.py``) can import config without
paying for the ML stack.
"""
from __future__ import annotations

import os
from collections import defaultdict
from pathlib import Path

# ── Paths ───────────────────────────────────────────────────────────
SCRAPER_ROOT = Path(__file__).resolve().parents[1]          # scraper/
PROJECT_ROOT = SCRAPER_ROOT.parent                          # repo root
SERVER_ROOT = PROJECT_ROOT / "server"


# ── .env loading ────────────────────────────────────────────────────
def _load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def load_env() -> None:
    """Populate os.environ from scraper/.env, then server/.env (no override).

    Precedence: real environment > scraper/.env > server/.env. This lets the
    scraper share the server's credentials while allowing a scraper-local
    override file. Safe to call multiple times.
    """
    _load_env_file(SCRAPER_ROOT / ".env")
    _load_env_file(SERVER_ROOT / ".env")
    _load_env_file(SERVER_ROOT / ".hf.env")


load_env()


# ── Credentials (read after load_env) ───────────────────────────────
def hf_token() -> str | None:
    return os.getenv("HF_TOKEN") or None


def gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or None


def db_dsn() -> str | None:
    """Live NeonDB connection string. Accept every name the project uses."""
    return (
        os.getenv("NEONDB_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("NEON_DSN")
        or None
    )


# ── HTTP ────────────────────────────────────────────────────────────
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# Rate-limit: seconds between requests to the same domain.
RATE_DELAY = 1.2
RATE_LIMIT: dict[str, float] = defaultdict(float)

# ── Crawl / enrich tuning ───────────────────────────────────────────
MAX_AGE_DAYS = 60            # reject articles older than this (None = no limit)
TARGET_PER_CATEGORY = 50     # articles to keep per category per source
CRAWL_MULT = 3               # crawl this many times the target, then filter down
MIN_TEXT_LEN = 300           # minimum article body length (chars)
ZS_THRESHOLD = 0.38          # zero-shot relevance cutoff
REQUEST_TIMEOUT = 15

# ── Sentiment classification thresholds ─────────────────────────────
NEUTRAL_THRESHOLD = 0.52
NEUTRAL_POLARITY_CAP = 0.18
POLARITY_MARGIN = 0.10

# ── HuggingFace model ids ───────────────────────────────────────────
MODELS = {
    "sentiment_general": "cardiffnlp/twitter-roberta-base-sentiment-latest",
    "sentiment_finance": "ProsusAI/finbert",
    "zero_shot": "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    "ner": "dslim/bert-base-NER",
    "summarizer": "facebook/bart-large-cnn",
    "toxicity": "unitary/toxic-bert",
}

# Which sentiment model to apply per topic (finance tone for Business).
SENTIMENT_MODEL_MAP: dict[str, str] = {
    "Business": "finance",
    "Sport": "general",
    "Health": "general",
    "Travel": "general",
    "World": "general",
    "Entertainment": "general",
    "Science": "general",
    "Politics": "general",
}

# ── Zero-shot candidate labels per topic ────────────────────────────
CATEGORY_LABELS: dict[str, list[str]] = {
    "Sport":         ["sports", "football", "basketball", "tennis", "cricket", "rugby", "golf", "olympics", "championship", "tournament", "match", "league", "player", "transfer", "injury", "world cup", "grand prix"],
    "Health":        ["health", "medicine", "disease", "illness", "treatment", "mental health", "nutrition", "diet", "fitness", "vaccine", "pandemic", "surgery", "healthcare", "cancer", "clinical trial"],
    "Travel":        ["travel", "tourism", "destination", "adventure", "hotel", "flight", "vacation", "holiday", "explore", "trip", "tourist", "airline", "resort", "backpacking", "cruise", "road trip"],
    "Business":      ["business", "economy", "finance", "market", "stock", "investment", "trade", "company", "startup", "inflation", "GDP", "revenue", "profit", "merger", "cryptocurrency", "banking", "interest rate", "recession", "earnings", "tariff"],
    "World":         ["international", "conflict", "diplomacy", "government", "war", "global affairs", "foreign policy", "military", "sanctions", "treaty", "protest", "crisis", "humanitarian", "geopolitics", "refugee", "ceasefire", "summit", "coup", "democracy"],
    "Politics":      ["politics", "government", "election", "policy", "law", "congress", "senate", "parliament", "president", "prime minister", "campaign", "vote", "legislation", "white house", "referendum", "minister", "governance"],
    "Entertainment": ["entertainment", "movies", "film", "music", "celebrity", "arts", "culture", "television", "streaming", "concert", "award", "fashion", "style", "Hollywood", "gaming", "pop culture", "album", "box office", "Oscars", "Grammy", "festival"],
    "Science":       ["science", "technology", "research", "innovation", "artificial intelligence", "AI", "space", "climate change", "environment", "biology", "physics", "engineering", "robotics", "cybersecurity", "quantum computing", "genetics", "astronomy", "NASA", "machine learning", "renewable energy"],
}

# Canonical topic vocabulary (matches the live DB's existing rows).
TOPICS = list(CATEGORY_LABELS.keys())
