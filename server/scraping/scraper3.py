import requests
from bs4 import BeautifulSoup
import re
import os
import nltk
import string
from collections import Counter
from newspaper import Article, Config
from transformers import pipeline
from datetime import datetime
import pandas as pd
import json
from pathlib import Path
from urllib.parse import urljoin, urlparse
from typing import Optional

SERVER_ROOT = Path(__file__).resolve().parents[1]
HF_ENV_PATH = SERVER_ROOT / ".hf.env"


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(HF_ENV_PATH)

HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    raise RuntimeError(
        f"Missing HF_TOKEN. Set it in the environment or add it to {HF_ENV_PATH}."
    )

nltk.download("punkt",     quiet=True)
nltk.download("punkt_tab", quiet=True)
nltk.download("stopwords", quiet=True)

# ============================================================
# STEP 1: LOAD AI MODELS
# ============================================================
print("⚙️  Loading AI models — first run takes ~5 min...")

# General news sentiment (Sport, Health, Travel, World, Entertainment)
sentiment_general = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    truncation=True, max_length=512, top_k=None,
)

# Financial sentiment (Business & Economy)
sentiment_finance = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert",
    truncation=True, max_length=512, top_k=None,
)

# Zero-shot classification — DeBERTa (higher accuracy than BART)
classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    token=HF_TOKEN,
)

# NER
ner_model = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple",
)

print("✅ All models loaded.\n")

# ============================================================
# STEP 2: CONFIGURATION
# ============================================================
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

config_np = Config()
config_np.browser_user_agent = USER_AGENT
config_np.request_timeout = 15

# Buffer ensures we scrape a bit extra so AI has enough to choose from
CRAWL_BUFFER    = 20   
# ── Categories & Sources ─────────────────────────────────────
SOURCE_CATEGORIES: dict[str, list[str]] = {
    "Sport": [
        "https://edition.cnn.com/sport",
        "https://www.bbc.com/sport",
        "https://www.aljazeera.com/sports/",
    ],
    "Health": [
        "https://edition.cnn.com/health",
        "https://www.bbc.com/future",           # BBC Future = health/science lifestyle
    ],
    "Travel": [
        "https://www.bbc.com/travel",
        "https://edition.cnn.com/travel",
        "https://www.aljazeera.com/travel",
    ],
    "Business": [
        "https://edition.cnn.com/business",
        "https://www.bbc.com/business",
        "https://www.aljazeera.com/economy/",
    ],
    "World": [
        "https://edition.cnn.com/world",
        "https://www.aljazeera.com/news/",
    ],
    "Politics": [
        "https://edition.cnn.com/politics",
    ],
    "Entertainment": [
        "https://edition.cnn.com/entertainment",
        "https://edition.cnn.com/style",
        "https://www.bbc.com/arts",
    ],
    "Science": [
        "https://www.bbc.com/technology",
        "https://edition.cnn.com/science",
        "https://www.aljazeera.com/tag/science-and-technology/",
    ],
}

# ── Extended zero-shot labels per category ───────────────────
CATEGORY_LABELS: dict[str, list[str]] = {
    "Sport": [
        "sports", "football", "soccer", "basketball", "tennis", "cricket",
        "rugby", "golf", "swimming", "cycling", "boxing", "athletics",
        "olympics", "championship", "tournament", "match", "league",
        "player", "team", "coach", "transfer", "injury", "competition",
        "world cup", "grand prix", "race", "scoreline",
    ],
    "Health": [
        "health", "medicine", "disease", "illness", "treatment", "therapy",
        "mental health", "nutrition", "diet", "fitness", "exercise",
        "medical research", "public health", "wellness", "hospital",
        "drug", "vaccine", "pandemic", "surgery", "healthcare",
        "cancer", "diabetes", "obesity", "clinical trial", "NHS",
    ],
    "Travel": [
        "travel", "tourism", "destination", "culture", "adventure",
        "hotel", "flight", "vacation", "holiday", "explore", "trip",
        "tourist", "airline", "resort", "backpacking", "itinerary",
        "visa", "passport", "luggage", "cruise", "road trip",
    ],
    "Business": [
        "business", "economy", "finance", "market", "stock", "investment",
        "trade", "company", "startup", "inflation", "GDP", "revenue",
        "profit", "merger", "acquisition", "cryptocurrency", "banking",
        "interest rate", "recession", "employment", "industry", "earnings",
        "hedge fund", "IPO", "supply chain", "tariff", "fiscal policy",
    ],
    "World": [
        "politics", "international", "conflict", "diplomacy", "government",
        "election", "war", "global affairs", "foreign policy", "military",
        "sanctions", "treaty", "protest", "crisis", "humanitarian",
        "United Nations", "NATO", "geopolitics", "refugee", "ceasefire",
        "summit", "parliament", "coup", "democracy", "human rights",
    ],
    "Politics": [
    "politics", "government", "election", "policy", "law",
    "congress", "senate", "parliament", "president", "prime minister",
    "campaign", "vote", "democracy", "legislation", "public policy",
    "white house", "geopolitics", "diplomacy", "political party",
    "referendum", "governance", "cabinet", "minister",
],
    "Entertainment": [
        "entertainment", "movies", "film", "music", "celebrity", "arts",
        "culture", "television", "streaming", "concert", "award",
        "fashion", "style", "design", "theater", "Hollywood", "gaming",
        "pop culture", "album", "box office", "Netflix", "Oscars",
        "Grammy", "festival", "reality TV", "influencer",
    ],
    "Science": [
        "science", "technology", "research", "innovation", "artificial intelligence",
        "AI", "space", "climate change", "environment", "biology", "physics",
        "engineering", "robotics", "cybersecurity", "quantum computing",
        "genetics", "astronomy", "ecology", "software", "data science",
        "machine learning", "renewable energy", "NASA", "CERN",
    ],
}

# ── Sentiment model routing ───────────────────────────────────
SENTIMENT_MODEL_MAP: dict[str, str] = {
    "Sport":         "general",
    "Health":        "general",
    "Travel":        "general",
    "Business":      "finance",
    "World":         "general",
    "Entertainment": "general",
    "Science":       "general",
    "Politics":      "general",
}

SENTIMENT_MODELS = {
    "general": sentiment_general,
    "finance": sentiment_finance,
}

# ── Sentiment thresholds ─────────────────────────────────────
NEUTRAL_THRESHOLD    = 0.52
NEUTRAL_POLARITY_CAP = 0.18
POLARITY_MARGIN      = 0.10

# ── Stopwords ────────────────────────────────────────────────
try:
    from nltk.corpus import stopwords as _sw
    STOP_WORDS = set(_sw.words("english"))
except Exception:
    STOP_WORDS = set()

# ============================================================
# DOMAIN HELPERS
# ============================================================
def get_domain(url: str) -> str:
    return urlparse(url).netloc.lower()

def is_cnn(url: str) -> bool:
    return "cnn.com" in get_domain(url)

def is_bbc(url: str) -> bool:
    return "bbc.com" in get_domain(url)

def is_aljazeera(url: str) -> bool:
    return "aljazeera.com" in get_domain(url)

def source_name(url: str) -> dict:
    d = get_domain(url)
    if "cnn.com"       in d: return {"id": "cnn",        "name": "CNN"}
    if "bbc.com"       in d: return {"id": "bbc",        "name": "BBC"}
    if "aljazeera.com" in d: return {"id": "aljazeera",  "name": "Al Jazeera"}
    return {"id": d, "name": d}

def make_absolute(href: str, base: str) -> str:
    parsed = urlparse(href)
    if parsed.scheme:
        return href.split("?")[0].split("#")[0]
    return urljoin(base, href).split("?")[0].split("#")[0]

# ============================================================
# URL ARTICLE DETECTION
# ============================================================
_CNN_INCLUDE = re.compile(r"/\d{4}/\d{2}/\d{2}/")
_CNN_EXCLUDE = re.compile(r"/video/|/gallery/|/live-updates/|/cnn-underscored/|/vr/")

_BBC_INCLUDE = re.compile(
    r"/articles/[a-z0-9]"                        # new BBC article format
    r"|/article/\d{8}"                           # BBC Travel format
    r"|/(sport|health|future|travel|business|arts|technology|news|science|culture|worklife|food|reel|earth)/[a-z0-9][a-z0-9-]*-\d{4,}"
)
_BBC_EXCLUDE = re.compile(r"/av/|/live/|/iplayer/|\.jpg$|\.png$|\.gif$|/election/results")

_AJ_INCLUDE  = re.compile(r"/\d{4}/\d{1,2}/\d{1,2}/")
_AJ_EXCLUDE  = re.compile(r"/video/|/gallery/|/podcast/|/program/|/liveblog/")

_JUNK = re.compile(
    r"(getty|reuters|ap photo|shutterstock|afp|file photo|@\w+/|/x$|\.com$|\.space|\bfile\b)",
    re.IGNORECASE,
)

def is_article_url(url: str, source_url: str) -> bool:
    if is_cnn(url):
        return bool(_CNN_INCLUDE.search(url)) and not _CNN_EXCLUDE.search(url)
    if is_bbc(url):
        return bool(_BBC_INCLUDE.search(url)) and not _BBC_EXCLUDE.search(url)
    if is_aljazeera(url):
        return bool(_AJ_INCLUDE.search(url))  and not _AJ_EXCLUDE.search(url)
    return bool(re.search(r"/\d{4}/\d{2}/\d{2}/", url))

def same_site_family(url: str, source_url: str) -> bool:
    FAMILIES = [
        {"cnn.com"},
        {"bbc.com", "bbc.co.uk"},
        {"aljazeera.com"},
    ]
    sd = get_domain(source_url)
    ud = get_domain(url)
    for family in FAMILIES:
        if any(f in sd for f in family):
            return any(f in ud for f in family)
    return sd == ud

# ============================================================
# SENTIMENT HELPERS
# ============================================================
def normalize_label(raw: str) -> str:
    s = str(raw).strip().lower()
    if "pos" in s: return "positive"
    if "neg" in s: return "negative"
    if "neu" in s: return "neutral"
    return {"label_0": "negative", "label_1": "neutral", "label_2": "positive"}.get(s, "neutral")

def extract_probs(raw_output) -> dict:
    probs = {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
    rows = raw_output
    if isinstance(rows, list) and rows and isinstance(rows[0], list):
        rows = rows[0]
    for entry in rows:
        if not isinstance(entry, dict):
            continue
        key = normalize_label(entry.get("label", "neutral"))
        try:
            probs[key] = max(0.0, min(1.0, float(entry["score"])))
        except Exception:
            pass
    total = sum(probs.values())
    if total > 0:
        probs = {k: v / total for k, v in probs.items()}
    return probs

def classify_sentiment(probs: dict) -> tuple:
    pos = probs.get("positive", 0.0)
    neu = probs.get("neutral",  0.0)
    neg = probs.get("negative", 0.0)
    polarity = pos - neg

    if neu >= NEUTRAL_THRESHOLD and abs(polarity) <= NEUTRAL_POLARITY_CAP:
        label = "neutral"
    elif polarity >= POLARITY_MARGIN:
        label = "positive"
    elif polarity <= -POLARITY_MARGIN:
        label = "negative"
    else:
        label = max(probs, key=probs.get)

    confidence = probs.get(label, max(probs.values()))
    return label, round(confidence, 4), round(polarity, 4)

# ============================================================
# KEYWORD EXTRACTION (enhanced)
# ============================================================
def extract_keywords(text: str, np_keywords: list, entities: dict, top_n: int = 25) -> list:
    combined: dict[str, int] = {}

    # 1. newspaper3k keywords (weight = 3)
    for kw in np_keywords:
        k = kw.lower().strip()
        if len(k) > 3 and k not in STOP_WORDS:
            combined[k] = combined.get(k, 0) + 3

    # 2. NER entity tokens (weight = 2)
    for ent_list in entities.values():
        for ent in ent_list:
            for tok in ent.lower().split():
                tok = tok.strip(string.punctuation)
                if len(tok) > 3 and tok not in STOP_WORDS:
                    combined[tok] = combined.get(tok, 0) + 2

    # 3. Frequency from full text (weight = 1)
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq  = Counter(w for w in words if w not in STOP_WORDS)
    for w, cnt in freq.most_common(60):
        if w not in combined:
            combined[w] = cnt

    # Sort by weight desc, then alpha
    sorted_kws = sorted(combined.items(), key=lambda x: -x[1])
    seen: set = set()
    result: list = []
    for kw, _ in sorted_kws:
        if kw not in seen:
            seen.add(kw)
            result.append(kw)
        if len(result) >= top_n:
            break
    return result

# ============================================================
# AUTHOR EXTRACTION
# ============================================================
def extract_author_info(soup: BeautifulSoup, url: str, np_authors: list) -> dict:
    name: str = ", ".join(np_authors) if np_authors else "Unknown"
    author_url: Optional[str] = None

    try:
        if is_cnn(url):
            # CNN: <span class="byline__name"> or <a> inside byline div
            for cls in ["byline__name", "byline-name", "Author__name"]:
                tag = soup.find(attrs={"class": re.compile(cls, re.I)})
                if tag:
                    link = tag if tag.name == "a" else tag.find("a", href=True)
                    if link and link.get("href"):
                        author_url = make_absolute(link["href"], url)
                        if not np_authors:
                            name = link.get_text(strip=True)
                        break

        elif is_bbc(url):
            # BBC: data-testid="byline-name" or href containing /news/correspondents/
            tag = soup.find(attrs={"data-testid": "byline-name"})
            if tag:
                link = tag if tag.name == "a" else tag.find("a", href=True)
                if link and link.get("href"):
                    author_url = make_absolute(link["href"], url)
            if not author_url:
                for a in soup.find_all("a", href=True):
                    href = a.get("href", "")
                    if "/news/correspondents/" in href or "/journalist/" in href:
                        author_url = make_absolute(href, url)
                        if not np_authors:
                            name = a.get_text(strip=True)
                        break

        elif is_aljazeera(url):
            # Al Jazeera: <div class="article-author"> or href /author/
            div = soup.find("div", {"class": re.compile(r"article-author|author-name", re.I)})
            if div:
                a = div.find("a", href=True)
                if a and a.get("href"):
                    author_url = make_absolute(a["href"], url)
                    if not np_authors:
                        name = a.get_text(strip=True)
            if not author_url:
                for a in soup.find_all("a", href=True):
                    if "/author/" in a.get("href", ""):
                        author_url = make_absolute(a["href"], url)
                        if not np_authors:
                            name = a.get_text(strip=True)
                        break

    except Exception:
        pass

    return {"name": name or "Unknown", "url": author_url}

# ============================================================
# VIDEO EXTRACTION
# ============================================================
def extract_video_url(soup: BeautifulSoup, url: str) -> Optional[str]:
    # 1. JSON-LD VideoObject
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict) and item.get("@type") in ("VideoObject", "MediaObject"):
                    v = item.get("contentUrl") or item.get("embedUrl")
                    if v:
                        return v
        except Exception:
            pass

    # 2. OG video meta
    og = soup.find("meta", {"property": "og:video"})
    if og and og.get("content"):
        return og["content"]

    # 3. Twitter player card
    tw = soup.find("meta", {"name": "twitter:player"})
    if tw and tw.get("content"):
        return tw["content"]

    # 4. CNN video data attribute
    if is_cnn(url):
        vd = soup.find(attrs={"data-video-slug": True})
        if vd:
            slug = vd.get("data-video-slug", "")
            if slug:
                return f"https://edition.cnn.com/videos/{slug}"

    # 5. BBC embed iframes
    if is_bbc(url):
        iframe = soup.find("iframe", {"src": re.compile(r"bbc\.co\.uk/news/av-embeds|player\.bbc\.com")})
        if iframe and iframe.get("src"):
            return iframe["src"]

    return None

# ============================================================
# STEP 3: CRAWL ONE SOURCE URL
# ============================================================
def crawl_source(source_url: str, category: str, max_candidates: int) -> list:
    results: list = []
    seen:    set  = set()
    headers = {"User-Agent": USER_AGENT}

    print(f"  🔍 {source_url}")
    try:
        resp = requests.get(source_url, headers=headers, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")

        for tag in soup.find_all("a", href=True):
            href = tag["href"]
            url  = make_absolute(href, source_url)

            if not same_site_family(url, source_url):
                continue
            if not is_article_url(url, source_url):
                continue
            if url in seen:
                continue

            # Title hint
            title_hint = tag.get("aria-label", "").strip()
            if not title_hint:
                for tn in ["h1", "h2", "h3", "h4", "span", "p"]:
                    el = tag.find(tn)
                    if el:
                        candidate = el.get_text(strip=True)
                        if len(candidate) >= 20 and not _JUNK.search(candidate):
                            title_hint = candidate
                            break
            if not title_hint:
                raw = tag.get_text(strip=True)
                if len(raw) >= 20 and not _JUNK.search(raw):
                    title_hint = raw
            if not title_hint:
                continue

            seen.add(url)
            results.append({
                "url":        url,
                "topic":      category,
                "title_hint": title_hint,
                "source_url": source_url,
            })
            if len(results) >= max_candidates:
                break

        print(f"     → {len(results)} candidates")
    except Exception as e:
        print(f"     ❌ {e}")

    return results

# ============================================================
# STEP 4: AI FILTER
# ============================================================
_PHOTO_RE = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|\/file|@\w+)", re.I)

def ai_filter(candidates: list, threshold: float = 0.40) -> list:
    if not candidates:
        return[]
        
    validated: list =[]
    print(f"  🤖 Validating {len(candidates)} candidates...")
    
    # 1. Quickly filter out junk titles first
    valid_candidates = []
    titles =[]
    for item in candidates:
        title = item["title_hint"]
        if not _PHOTO_RE.search(title) and len(title) >= 15:
            valid_candidates.append(item)
            titles.append(title)
            
    if not valid_candidates:
        print(f"     → 0 passed\n")
        return[]

    # 2. Batch process on the GPU! (Fixes the warning and makes it much faster)
    labels = CATEGORY_LABELS[valid_candidates[0]["topic"]]
    
    try:
        # multi_label=True fixes the issue where valid articles were getting rejected!
        results = classifier(titles, candidate_labels=labels, multi_label=True)
        
        # If there's only 1 item, results is a dict. Make it a list so we can loop over it safely.
        if isinstance(results, dict):
            results = [results]
            
        for item, result in zip(valid_candidates, results):
            top_score = result["scores"][0]  # The highest scoring label
            if top_score >= threshold:
                item["ai_relevance_score"] = round(top_score, 4)
                validated.append(item)
                
    except Exception as e:
        print(f"     ⚠️ AI error: {e}. Keeping all candidates as fallback.")
        validated = valid_candidates
        
    print(f"     → {len(validated)} passed\n")
    return validated

# ============================================================
# STEP 5: SCRAPE + ENRICH
# ============================================================
def process_articles(items: list) -> list:
    processed: list = []

    for item in items:
        url   = item["url"]
        topic = item["topic"]
        print(f"⚙️  [{topic}] {url}")

        try:
            art = Article(url, config=config_np)
            art.download()
            art.parse()
            art.nlp()

            text = art.text.strip()
            if len(text) < 300:
                print("   ⚠️  Too short, skip\n")
                continue

            # Description fallback
            desc = art.summary.strip()
            if not desc or len(desc) < 50:
                desc = text[:300] + "..."

            # ── Sentiment ────────────────────────────────────
            model_key  = SENTIMENT_MODEL_MAP.get(topic, "general")
            sent_model = SENTIMENT_MODELS[model_key]
            raw_sent   = sent_model(text[:1500])
            probs      = extract_probs(raw_sent)
            label, confidence, polarity = classify_sentiment(probs)

            # ── NER ──────────────────────────────────────────
            raw_ents = ner_model(text[:1500])
            entities = {"persons": [], "organizations": [], "locations": []}
            type_map = {"PER": "persons", "ORG": "organizations", "LOC": "locations"}
            for ent in raw_ents:
                key = type_map.get(ent["entity_group"])
                if key and ent["word"] not in entities[key]:
                    entities[key].append(ent["word"])

            # ── Extra page data (author, video) ───────────────
            soup: BeautifulSoup = BeautifulSoup("", "html.parser")
            try:
                r    = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=12)
                soup = BeautifulSoup(r.text, "html.parser")
            except Exception:
                pass

            author_info = extract_author_info(soup, url, art.authors)
            video_url   = extract_video_url(soup, url)

            # ── Keywords (enhanced) ───────────────────────────
            keywords = extract_keywords(text, art.keywords or [], entities, top_n=25)

            record = {
                "source":      source_name(url),
                "author":      author_info["name"],
                "authorUrl":   author_info["url"],
                "title":       art.title,
                "description": desc,
                "url":         url,
                "urlToImage":  art.top_image,
                "videoUrl":    video_url,
                "publishedAt": (
                    art.publish_date.isoformat()
                    if art.publish_date
                    else datetime.now().isoformat()
                ),
                "content": text,
                "sentiment": {
                    "type":        label,
                    "score":       confidence,
                    "comparative": polarity,
                    "probabilities": {
                        "positive": round(probs["positive"], 4),
                        "neutral":  round(probs["neutral"],  4),
                        "negative": round(probs["negative"], 4),
                    },
                    "model": model_key,
                },
                "topic":       topic,
                "keywords":    keywords,
                "entities":    entities,
                "ai_relevance": item.get("ai_relevance_score", 1.0),
            }

            processed.append(record)
            video_tag = "📹" if video_url   else ""
            author_tag = "👤" if author_info["url"] else ""
            print(
                f"   ✅ {label.upper()} | conf={confidence:.2f} | pol={polarity:+.2f} | "
                f"kw={len(keywords)} {video_tag}{author_tag}\n"
            )

        except Exception as e:
            print(f"   ❌ {e}\n")

    return processed

# ============================================================
# STEP 6: RUN PIPELINE
# ============================================================
all_candidates: list = []

print("=" * 65)
print("PHASE 1 & 2 — CRAWL + AI FILTER (per source URL)")
print("=" * 65)

for category, source_urls in SOURCE_CATEGORIES.items():
    num_links = len(source_urls)
    print(f"\n{'─'*50}")
    print(f"  CATEGORY: {category}  ({num_links} sources, target: exactly 50)")
    print(f"{'─'*50}")

    cat_selected: list = []
    
    # Calculate limits
    if num_links == 1:
        limits = [50]
    elif num_links == 2:
        limits = [25, 25]  # Exactly 25 per link
    else:
        limits = [30] * num_links # Scrape 30 from each, then pick best 50

    for i, src_url in enumerate(source_urls):
        limit = limits[i]
        
        # Scrape a bit extra (+20 buffer) so AI has enough to choose from
        raw = crawl_source(src_url, category, limit + 20)
        validated = ai_filter(raw, threshold=0.38)
        
        if num_links <= 2:
            top = validated[:limit] # strictly cap at 50 or 25
            cat_selected.extend(top)
            print(f"  ➡️  {len(top)} kept from {src_url}")
        else:
            cat_selected.extend(validated) # pool all together
            print(f"  ➡️  {len(validated)} added to pool from {src_url}")

    if num_links > 2:
        # Sort by best AI score and keep exactly top 50
        cat_selected = sorted(cat_selected, key=lambda x: x.get("ai_relevance_score", 0), reverse=True)
        cat_selected = cat_selected[:50]
        print(f"  🏆 Top 50 best articles selected overall for {category}.")

    all_candidates.extend(cat_selected)
    print(f"  📦 {category} total matched: {len(cat_selected)}")

print(f"\n{'='*65}")
print(f"PHASE 3 — SCRAPE + ENRICH  ({len(all_candidates)} articles)")
print("=" * 65 + "\n")

final_data = process_articles(all_candidates)

# ============================================================
# STEP 7: EXPORT
# ============================================================
if final_data:
    output = {
        "status":       "ok",
        "totalResults": len(final_data),
        "articles":     final_data,
        "scrapedAt":    datetime.now().isoformat(),
        "categories":   list(SOURCE_CATEGORIES.keys()),
        "aiModels": {
            "sentimentGeneral": "cardiffnlp/twitter-roberta-base-sentiment-latest",
            "sentimentFinance": "ProsusAI/finbert",
            "zeroShot":         "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
            "ner":              "dslim/bert-base-NER",
        },
    }

    project_root = Path(__file__).resolve().parents[2]
    output_path  = project_root / "client" / "src" / "app" / "data" / "news_data_cnn.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)

    # ── Summary ───────────────────────────────────────────────
    by_cat  = Counter(a["topic"] for a in final_data)
    by_sent = Counter(a["sentiment"]["type"] for a in final_data)
    n_video  = sum(1 for a in final_data if a.get("videoUrl"))
    n_author = sum(1 for a in final_data if a.get("authorUrl"))

    print("\n" + "=" * 65)
    print(f"✅  {len(final_data)} articles  →  {output_path}")
    print("=" * 65)
    print("\n📊 By category:")
    for cat, n in sorted(by_cat.items()): print(f"   {cat:<15} {n}")
    print("\n📊 By sentiment:")
    for s, n in by_sent.items():          print(f"   {s:<12} {n}")
    print(f"\n📹 With video URL  : {n_video}")
    print(f"👤 With author URL : {n_author}")
    print("\n📄 First article preview:")
    print(json.dumps(final_data[0], indent=2, default=str))
else:
    print("⚠️  No articles processed.")
