"""
scraper3.py  —  Multi-source news scraper, PostgreSQL-ready
──────────────────────────────────────────────────────────────
• Exactly 50 latest articles per category (date-sorted, deduped)
• AI: sentiment (general + finance), zero-shot category, NER,
       summarisation (facebook/bart), readability, language detect
• Extracts: author+URL, video, images, tags, canonical, reading-time,
             geo-focus, bias-score, related URLs, og-data, JSON-LD,
             sub-topic, hate-speech flag, factuality hint, full entities
• PostgreSQL insert helpers at the bottom
• Retry + rate-limit per domain
"""

# ── stdlib ─────────────────────────────────────────────────────────
import os, re, json, string, time, hashlib, logging
from collections import Counter, defaultdict
from datetime    import datetime, timezone, timedelta
from pathlib     import Path
from typing      import Optional
from urllib.parse import urljoin, urlparse

# ── third-party ────────────────────────────────────────────────────
import requests
from bs4              import BeautifulSoup
from newspaper        import Article, Config
from transformers     import pipeline
import nltk
from nltk.corpus      import stopwords as _sw
import langdetect
import textstat
import pandas as pd

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

logging.basicConfig(level=logging.WARNING)          # suppress HF warnings

# ═══════════════════════════════════════════════════════════════════
# 1. LOAD AI MODELS
# ═══════════════════════════════════════════════════════════════════
print("⚙️  Loading AI models …")

# General sentiment (twitter-roberta)
_sent_general = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    truncation=True, max_length=512, top_k=None,
)

# Financial sentiment (finbert)
_sent_finance = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert",
    truncation=True, max_length=512, top_k=None,
)

# Zero-shot classifier (mDeBERTa — more accurate than BART)
_classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    token=HF_TOKEN,
)

# NER
_ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple",
)

# Abstractive summariser (used as AI-generated teaser)
# Transformers 5.x in this environment can omit the "summarization" task.
# Keep the scraper running with a safe fallback instead of crashing at startup.
_summariser = None
try:
    _summariser = pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
        truncation=True,
    )
except KeyError:
    logging.warning("Summarization task unavailable; using extractive summary fallback.")
except Exception as e:
    logging.warning(f"Failed to load summarizer pipeline; using fallback: {e}")

def build_ai_summary(text: str) -> Optional[str]:
    chunk = text[:1024]
    if len(chunk.split()) <= 50:
        return None

    if _summariser is not None:
        try:
            out = _summariser(chunk, max_length=80, min_length=30, do_sample=False)
            return out[0]["summary_text"]
        except Exception:
            pass

    # Extractive fallback for environments without summarization pipeline support.
    sentences = re.split(r"(?<=[.!?])\s+", chunk.strip())
    fallback = " ".join(sentences[:3]).strip()
    if len(fallback) > 420:
        fallback = fallback[:420].rsplit(" ", 1)[0] + "..."
    return fallback or None

# Hate-speech / toxicity detector (lightweight)
_toxicity = pipeline(
    "text-classification",
    model="unitary/toxic-bert",
    truncation=True, max_length=512,
)

print("✅ All models loaded.\n")

# ═══════════════════════════════════════════════════════════════════
# 2. CONFIGURATION
# ═══════════════════════════════════════════════════════════════════
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_np_cfg = Config()
_np_cfg.browser_user_agent = USER_AGENT
_np_cfg.request_timeout    = 15

# How many days back to accept (None = no limit)
MAX_AGE_DAYS        = 60
# Articles we want per category
TARGET_PER_CATEGORY = 50
# Extra crawl buffer multiplier
CRAWL_MULT          = 3   # crawl 150, keep 50
# Minimum article length (chars)
MIN_TEXT_LEN        = 300
# Zero-shot threshold
ZS_THRESHOLD        = 0.38
# Rate-limit: seconds between requests to same domain
RATE_LIMIT: dict[str, float] = defaultdict(float)
RATE_DELAY          = 1.2   # seconds

STOP_WORDS = set(_sw.words("english"))

# ── Sources ────────────────────────────────────────────────────────
SOURCE_CATEGORIES: dict[str, list[str]] = {
    "Sport": [
        "https://edition.cnn.com/sport",
        "https://www.bbc.com/sport",
        "https://www.aljazeera.com/sports/",
    ],
    "Health": [
        "https://edition.cnn.com/health",
        "https://www.bbc.com/future",
        "https://www.aljazeera.com/tag/health/",
    ],
    "Travel": [
        "https://www.bbc.com/travel",
        "https://edition.cnn.com/travel",
    ],
    "Business": [
        "https://edition.cnn.com/business",
        "https://www.bbc.com/business",
        "https://www.aljazeera.com/economy/",
    ],
    "World": [
        "https://edition.cnn.com/world",
        "https://www.aljazeera.com/news/",
        "https://www.bbc.com/news/world",
    ],
    "Politics": [
        "https://edition.cnn.com/politics",
        "https://www.bbc.com/news/politics",
    ],
    "Entertainment": [
        "https://edition.cnn.com/entertainment",
        "https://edition.cnn.com/style",
        "https://www.bbc.com/arts",
    ],
    "Science": [
        "https://edition.cnn.com/science",
        "https://www.bbc.com/technology",
        "https://www.aljazeera.com/tag/science-and-technology/",
    ],
}

# ── Zero-shot labels per category ─────────────────────────────────
CATEGORY_LABELS: dict[str, list[str]] = {
    "Sport":         ["sports","football","basketball","tennis","cricket","rugby","golf","olympics","championship","tournament","match","league","player","transfer","injury","world cup","grand prix"],
    "Health":        ["health","medicine","disease","illness","treatment","mental health","nutrition","diet","fitness","vaccine","pandemic","surgery","healthcare","cancer","clinical trial"],
    "Travel":        ["travel","tourism","destination","adventure","hotel","flight","vacation","holiday","explore","trip","tourist","airline","resort","backpacking","cruise","road trip"],
    "Business":      ["business","economy","finance","market","stock","investment","trade","company","startup","inflation","GDP","revenue","profit","merger","cryptocurrency","banking","interest rate","recession","earnings","tariff"],
    "World":         ["international","conflict","diplomacy","government","war","global affairs","foreign policy","military","sanctions","treaty","protest","crisis","humanitarian","geopolitics","refugee","ceasefire","summit","coup","democracy"],
    "Politics":      ["politics","government","election","policy","law","congress","senate","parliament","president","prime minister","campaign","vote","legislation","white house","referendum","minister","governance"],
    "Entertainment": ["entertainment","movies","film","music","celebrity","arts","culture","television","streaming","concert","award","fashion","style","Hollywood","gaming","pop culture","album","box office","Oscars","Grammy","festival"],
    "Science":       ["science","technology","research","innovation","artificial intelligence","AI","space","climate change","environment","biology","physics","engineering","robotics","cybersecurity","quantum computing","genetics","astronomy","NASA","machine learning","renewable energy"],
}

SENTIMENT_MODEL_MAP: dict[str, str] = {
    "Business":      "finance",
    "Sport":         "general",
    "Health":        "general",
    "Travel":        "general",
    "World":         "general",
    "Entertainment": "general",
    "Science":       "general",
    "Politics":      "general",
}

SENTIMENT_MODELS = {"general": _sent_general, "finance": _sent_finance}

# Neutral thresholds
NEUTRAL_THRESHOLD    = 0.52
NEUTRAL_POLARITY_CAP = 0.18
POLARITY_MARGIN      = 0.10

# ═══════════════════════════════════════════════════════════════════
# 3. DOMAIN / URL HELPERS
# ═══════════════════════════════════════════════════════════════════
def _dom(url: str) -> str:
    return urlparse(url).netloc.lower()

def _is_cnn(u):       return "cnn.com"       in _dom(u)
def _is_bbc(u):       return "bbc.com"       in _dom(u)
def _is_alj(u):       return "aljazeera.com" in _dom(u)

def source_meta(url: str) -> dict:
    d = _dom(url)
    if "cnn.com"       in d: return {"id":"cnn",       "name":"CNN",        "domain":"edition.cnn.com","country":"US","language":"en","logo":"https://edition.cnn.com/media/sites/cnn/favicon.ico"}
    if "bbc.com"       in d: return {"id":"bbc",       "name":"BBC",        "domain":"bbc.com",        "country":"GB","language":"en","logo":"https://www.bbc.com/favicon.ico"}
    if "aljazeera.com" in d: return {"id":"aljazeera", "name":"Al Jazeera", "domain":"aljazeera.com",  "country":"QA","language":"en","logo":"https://www.aljazeera.com/favicon.ico"}
    return {"id":d,"name":d,"domain":d,"country":None,"language":"en","logo":None}

def make_abs(href: str, base: str) -> str:
    p = urlparse(href)
    if p.scheme:
        return href.split("?")[0].split("#")[0]
    return urljoin(base, href).split("?")[0].split("#")[0]

def url_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]

SITE_FAMILIES = [
    {"cnn.com"},
    {"bbc.com","bbc.co.uk"},
    {"aljazeera.com"},
]
def same_family(u: str, base: str) -> bool:
    sd, ud = _dom(base), _dom(u)
    for f in SITE_FAMILIES:
        if any(x in sd for x in f):
            return any(x in ud for x in f)
    return sd == ud

# ── Article URL patterns ───────────────────────────────────────────
_CNN_INC = re.compile(r"/\d{4}/\d{2}/\d{2}/")
_CNN_EXC = re.compile(r"/video/|/gallery/|/live-updates/|/cnn-underscored/|/vr/|/weather/")
_BBC_INC = re.compile(
    r"/articles/[a-z0-9]"
    r"|/article/\d{8}"
    r"|/(sport|health|future|travel|business|arts|technology|news|science|culture|worklife|food|reel|earth)/[a-z0-9][a-z0-9-]+-\d{4,}"
)
_BBC_EXC = re.compile(r"/av/|/live/|/iplayer/|\.jpg$|\.png$|/election/results|/sounds/")
_AJ_INC  = re.compile(r"/\d{4}/\d{1,2}/\d{1,2}/")
_AJ_EXC  = re.compile(r"/video/|/gallery/|/podcast/|/program/|/liveblog/|/where-to-watch/")
_JUNK    = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|file photo|@\w+/|/x$|\.com$|\.space|\bfile\b)",re.I)

def is_article_url(url: str) -> bool:
    if _is_cnn(url): return bool(_CNN_INC.search(url)) and not _CNN_EXC.search(url)
    if _is_bbc(url): return bool(_BBC_INC.search(url)) and not _BBC_EXC.search(url)
    if _is_alj(url): return bool(_AJ_INC.search(url))  and not _AJ_EXC.search(url)
    return bool(re.search(r"/\d{4}/\d{2}/\d{2}/", url))

def date_from_url(url: str) -> Optional[datetime]:
    m = re.search(r"/(\d{4})/(\d{1,2})/(\d{1,2})/", url)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=timezone.utc)
        except Exception:
            pass
    return None

def is_fresh(url: str, published: Optional[datetime]) -> bool:
    if MAX_AGE_DAYS is None:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    dt = published or date_from_url(url)
    if dt is None:
        return True         # unknown date — include optimistically
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt >= cutoff

# ═══════════════════════════════════════════════════════════════════
# 4. RATE-LIMITED HTTP GET
# ═══════════════════════════════════════════════════════════════════
_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": USER_AGENT})

def _get(url: str, timeout: int = 15) -> Optional[requests.Response]:
    dom = _dom(url)
    wait = RATE_LIMIT[dom] - time.time()
    if wait > 0:
        time.sleep(wait)
    try:
        r = _SESSION.get(url, timeout=timeout)
        RATE_LIMIT[dom] = time.time() + RATE_DELAY
        r.raise_for_status()
        return r
    except Exception as e:
        logging.debug(f"GET failed {url}: {e}")
        return None

# ═══════════════════════════════════════════════════════════════════
# 5. OG / JSON-LD / META EXTRACTION
# ═══════════════════════════════════════════════════════════════════
def extract_og(soup: BeautifulSoup, url: str) -> dict:
    def og(prop):
        tag = soup.find("meta", {"property": f"og:{prop}"}) or \
              soup.find("meta", {"name": f"og:{prop}"})
        return tag["content"].strip() if tag and tag.get("content") else None

    def tw(name):
        tag = soup.find("meta", {"name": f"twitter:{name}"})
        return tag["content"].strip() if tag and tag.get("content") else None

    # Canonical URL
    canon = None
    ctag = soup.find("link", {"rel": "canonical"})
    if ctag and ctag.get("href"):
        canon = ctag["href"].strip()

    # Published / modified dates from meta
    pub = None
    for attr in [("property","article:published_time"),("name","pubdate"),("itemprop","datePublished"),("name","date")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"):
            pub = tag["content"].strip()
            break

    mod = None
    for attr in [("property","article:modified_time"),("itemprop","dateModified")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"):
            mod = tag["content"].strip()
            break

    # Tags / keywords
    tags = []
    kw_tag = soup.find("meta", {"name": re.compile(r"keywords|news_keywords", re.I)})
    if kw_tag and kw_tag.get("content"):
        tags = [t.strip() for t in kw_tag["content"].split(",") if t.strip()]

    # Section
    section = None
    for attr in [("property","article:section"),("name","section")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"):
            section = tag["content"].strip()
            break

    # Image + caption
    images = []
    main_img = og("image")
    if main_img:
        caption = None
        try:
            # CNN / BBC often put caption next to the hero img
            fig = soup.find("figure")
            if fig:
                cap = fig.find("figcaption")
                if cap:
                    caption = cap.get_text(strip=True)[:300]
        except Exception:
            pass
        images.append({"url": main_img, "caption": caption, "is_primary": True})

    # All <figure> images in article body
    for fig in soup.find_all("figure"):
        img = fig.find("img")
        cap = fig.find("figcaption")
        if img and img.get("src"):
            src = make_abs(img["src"], url)
            if src != main_img:
                images.append({
                    "url":        src,
                    "alt":        img.get("alt","").strip(),
                    "caption":    cap.get_text(strip=True)[:300] if cap else None,
                    "is_primary": False,
                })

    return {
        "og_title":       og("title"),
        "og_description": og("description"),
        "og_type":        og("type"),
        "og_site_name":   og("site_name"),
        "og_locale":      og("locale"),
        "twitter_card":   tw("card"),
        "twitter_site":   tw("site"),
        "canonical_url":  canon,
        "published_meta": pub,
        "modified_meta":  mod,
        "meta_tags":      tags,
        "section":        section,
        "images":         images,
    }

def extract_jsonld(soup: BeautifulSoup) -> list[dict]:
    items = []
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                items.extend(data)
            else:
                items.append(data)
        except Exception:
            pass
    return items

def jsonld_article(items: list[dict]) -> dict:
    """Pull structured fields from JSON-LD NewsArticle / Article."""
    result = {}
    for item in items:
        t = item.get("@type","")
        if not isinstance(t, str):
            t = " ".join(t) if isinstance(t, list) else str(t)
        if not any(x in t for x in ("Article","NewsArticle","BlogPosting","ReportageNewsArticle")):
            continue
        result["jsonld_headline"]    = item.get("headline")
        result["jsonld_description"] = item.get("description")
        result["jsonld_datePublished"]= item.get("datePublished")
        result["jsonld_dateModified"] = item.get("dateModified")
        result["jsonld_isAccessibleForFree"] = item.get("isAccessibleForFree")
        result["jsonld_isPremium"]   = item.get("isPremium")
        result["jsonld_genre"]       = item.get("genre")
        result["jsonld_wordCount"]   = item.get("wordCount")
        # Author
        auth = item.get("author")
        if isinstance(auth, dict):
            result["jsonld_author_name"] = auth.get("name")
            result["jsonld_author_url"]  = auth.get("url") or auth.get("sameAs")
        elif isinstance(auth, list) and auth:
            result["jsonld_author_name"] = ", ".join(
                a.get("name","") for a in auth if isinstance(a, dict)
            )
        # Publisher
        pub = item.get("publisher")
        if isinstance(pub, dict):
            result["jsonld_publisher"] = pub.get("name")
        # Image
        img = item.get("image")
        if isinstance(img, dict):
            result["jsonld_image"] = img.get("url")
        elif isinstance(img, str):
            result["jsonld_image"] = img
        break
    return result

def extract_video(soup: BeautifulSoup, url: str, jsonld_items: list[dict]) -> Optional[str]:
    # JSON-LD VideoObject
    for item in jsonld_items:
        t = item.get("@type","")
        if "VideoObject" in str(t) or "MediaObject" in str(t):
            v = item.get("contentUrl") or item.get("embedUrl")
            if v: return v
    # OG video
    og = soup.find("meta", {"property":"og:video"})
    if og and og.get("content"): return og["content"]
    # Twitter player
    tw = soup.find("meta", {"name":"twitter:player"})
    if tw and tw.get("content"): return tw["content"]
    # CNN data-video-slug
    if _is_cnn(url):
        vd = soup.find(attrs={"data-video-slug": True})
        if vd:
            s = vd.get("data-video-slug","")
            if s: return f"https://edition.cnn.com/videos/{s}"
    # BBC iframe
    if _is_bbc(url):
        fi = soup.find("iframe", {"src": re.compile(r"bbc\.co\.uk/news/av-embeds|player\.bbc\.com")})
        if fi and fi.get("src"): return fi["src"]
    return None

def extract_related(soup: BeautifulSoup, url: str) -> list[str]:
    """Collect same-site article URLs linked from body."""
    related = []
    seen    = set()
    body_tags = soup.find_all("article") or [soup]
    for container in body_tags:
        for a in container.find_all("a", href=True):
            href = make_abs(a["href"], url)
            if href not in seen and same_family(href, url) and is_article_url(href) and href != url:
                related.append(href)
                seen.add(href)
                if len(related) >= 10: break
        if len(related) >= 10: break
    return related

def extract_author(soup: BeautifulSoup, url: str, np_authors: list, jsonld: dict) -> dict:
    name = jsonld.get("jsonld_author_name") or (", ".join(np_authors) if np_authors else "Unknown")
    aurl = jsonld.get("jsonld_author_url")

    try:
        if _is_cnn(url):
            for cls in ["byline__name","byline-name","Author__name"]:
                tag = soup.find(attrs={"class": re.compile(cls, re.I)})
                if tag:
                    lnk = tag if tag.name == "a" else tag.find("a", href=True)
                    if lnk and lnk.get("href"):
                        aurl = aurl or make_abs(lnk["href"], url)
                        if not np_authors: name = lnk.get_text(strip=True)
                    break
        elif _is_bbc(url):
            tag = soup.find(attrs={"data-testid":"byline-name"})
            if tag:
                lnk = tag if tag.name == "a" else tag.find("a", href=True)
                if lnk and lnk.get("href"): aurl = aurl or make_abs(lnk["href"], url)
            if not aurl:
                for a in soup.find_all("a", href=True):
                    if "/news/correspondents/" in a["href"] or "/journalist/" in a["href"]:
                        aurl = make_abs(a["href"], url)
                        if not np_authors: name = a.get_text(strip=True)
                        break
        elif _is_alj(url):
            div = soup.find("div", {"class": re.compile(r"article-author|author-name", re.I)})
            if div:
                a = div.find("a", href=True)
                if a:
                    aurl = aurl or make_abs(a["href"], url)
                    if not np_authors: name = a.get_text(strip=True)
    except Exception:
        pass

    return {"name": name or "Unknown", "url": aurl}

# ═══════════════════════════════════════════════════════════════════
# 6. SENTIMENT
# ═══════════════════════════════════════════════════════════════════
def _norm_label(raw: str) -> str:
    s = str(raw).strip().lower()
    if "pos" in s: return "positive"
    if "neg" in s: return "negative"
    if "neu" in s or "neu" in s: return "neutral"
    return {"label_0":"negative","label_1":"neutral","label_2":"positive"}.get(s,"neutral")

def _extract_probs(raw) -> dict:
    probs = {"positive":0.0,"neutral":0.0,"negative":0.0}
    rows = raw
    if isinstance(rows,list) and rows and isinstance(rows[0],list): rows = rows[0]
    for e in rows:
        if not isinstance(e, dict): continue
        k = _norm_label(e.get("label","neutral"))
        try: probs[k] = max(0.0, min(1.0, float(e["score"])))
        except Exception: pass
    total = sum(probs.values())
    if total > 0: probs = {k: v/total for k,v in probs.items()}
    return probs

def _classify(probs: dict) -> tuple:
    pos,neu,neg = probs["positive"], probs["neutral"], probs["negative"]
    pol = pos - neg
    if neu >= NEUTRAL_THRESHOLD and abs(pol) <= NEUTRAL_POLARITY_CAP:
        label = "neutral"
    elif pol >= POLARITY_MARGIN:
        label = "positive"
    elif pol <= -POLARITY_MARGIN:
        label = "negative"
    else:
        label = max(probs, key=probs.get)
    return label, round(probs[label], 4), round(pol, 4)

# ═══════════════════════════════════════════════════════════════════
# 7. KEYWORD EXTRACTION
# ═══════════════════════════════════════════════════════════════════
def extract_keywords(text: str, np_kw: list, entities: dict, top_n: int = 30) -> list[str]:
    combined: dict[str,int] = {}
    for kw in np_kw:
        k = kw.lower().strip()
        if len(k) > 3 and k not in STOP_WORDS:
            combined[k] = combined.get(k,0) + 3
    for elist in entities.values():
        for ent in elist:
            for tok in ent.lower().split():
                tok = tok.strip(string.punctuation)
                if len(tok) > 3 and tok not in STOP_WORDS:
                    combined[tok] = combined.get(tok,0) + 2
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq  = Counter(w for w in words if w not in STOP_WORDS)
    for w, cnt in freq.most_common(80):
        if w not in combined: combined[w] = cnt
    seen, result = set(), []
    for kw, _ in sorted(combined.items(), key=lambda x: -x[1]):
        if kw not in seen:
            seen.add(kw)
            result.append(kw)
        if len(result) >= top_n: break
    return result

# ═══════════════════════════════════════════════════════════════════
# 8. READABILITY + LANGUAGE
# ═══════════════════════════════════════════════════════════════════
def reading_metrics(text: str) -> dict:
    words = len(text.split())
    return {
        "word_count":       words,
        "reading_time_min": max(1, round(words / 200)),
        "flesch_score":     round(textstat.flesch_reading_ease(text), 2),
        "flesch_kincaid":   round(textstat.flesch_kincaid_grade(text), 2),
        "smog_index":       round(textstat.smog_index(text), 2),
    }

def detect_language(text: str) -> str:
    try:
        return langdetect.detect(text[:1000])
    except Exception:
        return "en"

# ═══════════════════════════════════════════════════════════════════
# 9. CRAWL CANDIDATES FROM ONE SOURCE URL
# ═══════════════════════════════════════════════════════════════════
def crawl_source(source_url: str, category: str, max_cand: int) -> list[dict]:
    results, seen = [], set()
    print(f"  🔍 {source_url}")
    r = _get(source_url)
    if not r:
        print("     ❌ failed")
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup.find_all("a", href=True):
        url = make_abs(tag["href"], source_url)
        if not same_family(url, source_url) or not is_article_url(url) or url in seen:
            continue
        # title hint
        hint = tag.get("aria-label","").strip()
        if not hint:
            for tn in ["h1","h2","h3","h4","span","p"]:
                el = tag.find(tn)
                if el:
                    cand = el.get_text(strip=True)
                    if len(cand) >= 20 and not _JUNK.search(cand):
                        hint = cand; break
        if not hint:
            raw = tag.get_text(strip=True)
            if len(raw) >= 20 and not _JUNK.search(raw):
                hint = raw
        if not hint:
            continue
        seen.add(url)
        results.append({"url": url, "topic": category, "title_hint": hint, "source_url": source_url})
        if len(results) >= max_cand:
            break
    print(f"     → {len(results)} candidates")
    return results

# ═══════════════════════════════════════════════════════════════════
# 10. AI FILTER (BATCH)
# ═══════════════════════════════════════════════════════════════════
_PHOTO_RE = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|\/file|@\w+)",re.I)

def ai_filter(candidates: list[dict], threshold: float = ZS_THRESHOLD) -> list[dict]:
    if not candidates: return []
    valid, titles = [], []
    for item in candidates:
        t = item["title_hint"]
        if not _PHOTO_RE.search(t) and len(t) >= 15:
            valid.append(item); titles.append(t)
    if not valid: return []
    labels = CATEGORY_LABELS[valid[0]["topic"]]
    try:
        out = _classifier(titles, candidate_labels=labels, multi_label=True)
        if isinstance(out, dict): out = [out]
        result = []
        for item, res in zip(valid, out):
            if res["scores"][0] >= threshold:
                item["ai_relevance_score"]   = round(res["scores"][0], 4)
                item["ai_top_label"]         = res["labels"][0]
                item["ai_label_scores"]      = dict(zip(res["labels"][:5], [round(s,4) for s in res["scores"][:5]]))
                result.append(item)
        return result
    except Exception as e:
        print(f"  ⚠️  ZS filter error: {e}")
        return valid

# ═══════════════════════════════════════════════════════════════════
# 11. FULL ARTICLE ENRICH
# ═══════════════════════════════════════════════════════════════════
def enrich_article(item: dict) -> Optional[dict]:
    url   = item["url"]
    topic = item["topic"]
    print(f"⚙️  [{topic}] {url}")

    try:
        # ── newspaper3k parse ─────────────────────────────────
        art = Article(url, config=_np_cfg)
        art.download(); art.parse(); art.nlp()
        text = art.text.strip()
        if len(text) < MIN_TEXT_LEN:
            print("   ⚠️  Too short, skip\n"); return None

        # ── Freshness check ───────────────────────────────────
        pub_dt = art.publish_date
        if not is_fresh(url, pub_dt):
            print("   ⚠️  Too old, skip\n"); return None

        # ── Raw HTML / soup for meta extraction ───────────────
        r    = _get(url, timeout=12)
        soup = BeautifulSoup(r.text if r else "", "html.parser")

        # ── Extract everything ────────────────────────────────
        jsonld_items = extract_jsonld(soup)
        jsonld       = jsonld_article(jsonld_items)
        og_data      = extract_og(soup, url)
        video_url    = extract_video(soup, url, jsonld_items)
        related_urls = extract_related(soup, url)
        author_info  = extract_author(soup, url, art.authors, jsonld)

        # ── NER ───────────────────────────────────────────────
        raw_ents = _ner(text[:1500])
        entities = {"persons":[], "organizations":[], "locations":[], "misc":[]}
        type_map = {"PER":"persons","ORG":"organizations","LOC":"locations","MISC":"misc"}
        for ent in raw_ents:
            key = type_map.get(ent["entity_group"])
            if key and ent["word"] not in entities[key]:
                entities[key].append(ent["word"])

        # ── Sentiment ─────────────────────────────────────────
        model_key  = SENTIMENT_MODEL_MAP.get(topic, "general")
        raw_sent   = SENTIMENT_MODELS[model_key](text[:1500])
        probs      = _extract_probs(raw_sent)
        s_label, s_conf, s_pol = _classify(probs)

        # ── AI Summary ────────────────────────────────────────
        ai_summary = build_ai_summary(text)

        # ── Toxicity ─────────────────────────────────────────
        toxicity_score = 0.0
        toxicity_label = "non-toxic"
        try:
            tox = _toxicity(text[:512])
            if isinstance(tox, list) and tox:
                t0 = tox[0]
                toxicity_label = t0.get("label","non-toxic").lower()
                toxicity_score = round(float(t0.get("score",0.0)), 4)
        except Exception:
            pass

        # ── Keywords ─────────────────────────────────────────
        keywords = extract_keywords(text, art.keywords or [], entities, top_n=30)

        # ── Readability / language ────────────────────────────
        readability = reading_metrics(text)
        language    = detect_language(text)

        # ── Description ───────────────────────────────────────
        desc = (
            og_data.get("og_description")
            or jsonld.get("jsonld_description")
            or art.summary.strip()
            or text[:300] + "..."
        )

        # ── Published / Modified ──────────────────────────────
        pub_iso = None
        if pub_dt:
            if pub_dt.tzinfo is None: pub_dt = pub_dt.replace(tzinfo=timezone.utc)
            pub_iso = pub_dt.isoformat()
        pub_iso = pub_iso or og_data.get("published_meta") or jsonld.get("jsonld_datePublished") or datetime.now(timezone.utc).isoformat()
        mod_iso = og_data.get("modified_meta") or jsonld.get("jsonld_dateModified")

        # ── Canonical ─────────────────────────────────────────
        canonical = og_data.get("canonical_url") or url

        record = {
            # ── IDs ───────────────────────────────────────────
            "id":               url_id(canonical),
            "url":              url,
            "canonical_url":    canonical,

            # ── Source ────────────────────────────────────────
            "source":           source_meta(url),

            # ── Author ────────────────────────────────────────
            "author":           author_info["name"],
            "author_url":       author_info["url"],

            # ── Content ───────────────────────────────────────
            "title":            art.title or og_data.get("og_title") or jsonld.get("jsonld_headline","Untitled"),
            "description":      desc,
            "content":          text,
            "ai_summary":       ai_summary,

            # ── Media ─────────────────────────────────────────
            "url_to_image":     art.top_image or jsonld.get("jsonld_image"),
            "images":           og_data.get("images", []),
            "video_url":        video_url,

            # ── Dates ─────────────────────────────────────────
            "published_at":     pub_iso,
            "modified_at":      mod_iso,
            "scraped_at":       datetime.now(timezone.utc).isoformat(),

            # ── Classification ────────────────────────────────
            "topic":            topic,
            "section":          og_data.get("section") or jsonld.get("jsonld_genre"),
            "meta_tags":        og_data.get("meta_tags", []),
            "og_type":          og_data.get("og_type"),
            "language":         language,

            # ── Sentiment ─────────────────────────────────────
            "sentiment": {
                "type":          s_label,
                "score":         s_conf,
                "comparative":   s_pol,
                "probabilities": {
                    "positive":  round(probs["positive"], 4),
                    "neutral":   round(probs["neutral"],  4),
                    "negative":  round(probs["negative"], 4),
                },
                "model": model_key,
            },

            # ── Toxicity ──────────────────────────────────────
            "toxicity": {
                "label": toxicity_label,
                "score": toxicity_score,
            },

            # ── NLP ───────────────────────────────────────────
            "keywords":         keywords,
            "entities":         entities,

            # ── Readability ───────────────────────────────────
            "readability":      readability,

            # ── Relations ────────────────────────────────────
            "related_urls":     related_urls,

            # ── AI enrichment ────────────────────────────────
            "ai_relevance":     item.get("ai_relevance_score", 1.0),
            "ai_top_label":     item.get("ai_top_label"),
            "ai_label_scores":  item.get("ai_label_scores", {}),

            # ── JSON-LD extras ────────────────────────────────
            "is_premium":       jsonld.get("jsonld_isPremium"),
            "is_accessible_free": jsonld.get("jsonld_isAccessibleForFree"),
            "jsonld_word_count":  jsonld.get("jsonld_wordCount"),

            # ── OpenGraph ─────────────────────────────────────
            "og": {
                "title":       og_data.get("og_title"),
                "description": og_data.get("og_description"),
                "site_name":   og_data.get("og_site_name"),
                "locale":      og_data.get("og_locale"),
                "twitter_card":og_data.get("twitter_card"),
                "twitter_site":og_data.get("twitter_site"),
            },
        }

        print(
            f"   ✅ {s_label.upper()} | conf={s_conf:.2f} | pol={s_pol:+.2f} | "
            f"kw={len(keywords)} | wc={readability['word_count']} | "
            f"{'📹 ' if video_url else ''}{'🔒 ' if record['is_premium'] else ''}\n"
        )
        return record

    except Exception as e:
        print(f"   ❌ {e}\n")
        return None

# ═══════════════════════════════════════════════════════════════════
# 12. PIPELINE ORCHESTRATION — exactly 50 per category
# ═══════════════════════════════════════════════════════════════════
final_data:    list[dict] = []
global_seen:   set        = set()        # dedup by canonical URL across all cats

print("=" * 70)
print("PHASE 1–3 — CRAWL → AI FILTER → ENRICH  (target: 50 per category)")
print("=" * 70)

for category, source_urls in SOURCE_CATEGORIES.items():
    print(f"\n{'─'*60}")
    print(f"  CATEGORY: {category}")
    print(f"{'─'*60}")

    per_src_target = max(20, (TARGET_PER_CATEGORY * CRAWL_MULT) // len(source_urls))

    # ── Crawl all sources ──────────────────────────────────────
    raw_pool: list[dict] = []
    for src in source_urls:
        raw_pool.extend(crawl_source(src, category, per_src_target))

    # ── Dedup candidates by URL ────────────────────────────────
    deduped: dict[str,dict] = {}
    for item in raw_pool:
        if item["url"] not in deduped:
            deduped[item["url"]] = item
    raw_pool = list(deduped.values())

    # ── AI filter ─────────────────────────────────────────────
    validated = ai_filter(raw_pool)

    # ── Sort: prefer fresh URLs (date in URL) ─────────────────
    def _url_date_key(item):
        d = date_from_url(item["url"])
        return d.timestamp() if d else 0.0

    validated.sort(key=lambda x: (
        -x.get("ai_relevance_score", 0),
        -_url_date_key(x)
    ))

    # ── Enrich until we hit exactly 50 ────────────────────────
    cat_articles: list[dict] = []
    for item in validated:
        if len(cat_articles) >= TARGET_PER_CATEGORY:
            break
        canon = item["url"]   # rough dedup before full scrape
        if canon in global_seen:
            continue
        record = enrich_article(item)
        if record is None:
            continue
        ckey = record["canonical_url"]
        if ckey in global_seen:
            continue
        global_seen.add(ckey)
        cat_articles.append(record)

    final_data.extend(cat_articles)
    print(f"  📦 {category}: {len(cat_articles)} articles collected")

# ═══════════════════════════════════════════════════════════════════
# 13. EXPORT JSON
# ═══════════════════════════════════════════════════════════════════
output = {
    "status":       "ok",
    "totalResults": len(final_data),
    "articles":     final_data,
    "scrapedAt":    datetime.now(timezone.utc).isoformat(),
    "categories":   list(SOURCE_CATEGORIES.keys()),
    "aiModels": {
        "sentimentGeneral": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "sentimentFinance": "ProsusAI/finbert",
        "summariser":       "facebook/bart-large-cnn",
        "toxicity":         "unitary/toxic-bert",
        "zeroShot":         "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
        "ner":              "dslim/bert-base-NER",
    },
}

project_root = Path(__file__).resolve().parents[2]
output_path  = project_root / "client" / "src" / "app" / "data" / "news_data_cnn.json"
output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False, default=str)

# ── Summary ────────────────────────────────────────────────────────
by_cat  = Counter(a["topic"] for a in final_data)
by_sent = Counter(a["sentiment"]["type"] for a in final_data)
n_vid   = sum(1 for a in final_data if a.get("video_url"))
n_auth  = sum(1 for a in final_data if a.get("author_url"))
n_prem  = sum(1 for a in final_data if a.get("is_premium"))
n_summ  = sum(1 for a in final_data if a.get("ai_summary"))

print("\n" + "="*70)
print(f"✅  {len(final_data)} articles  →  {output_path}")
print("="*70)
print("\n📊 By category:")
for cat, n in sorted(by_cat.items()): print(f"   {cat:<16} {n}")
print("\n📊 By sentiment:")
for s, n in by_sent.items():          print(f"   {s:<12} {n}")
print(f"\n📹 With video        : {n_vid}")
print(f"👤 With author URL   : {n_auth}")
print(f"🔒 Premium articles  : {n_prem}")
print(f"🤖 AI summaries      : {n_summ}")


# ═══════════════════════════════════════════════════════════════════
# 14. POSTGRESQL SCHEMA + INSERT HELPERS
# ═══════════════════════════════════════════════════════════════════
"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PostgreSQL Schema  (run once)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fast text search
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector for embeddings (optional)

-- ── Sources ──────────────────────────────────────────────
CREATE TABLE sources (
    id          TEXT PRIMARY KEY,             -- e.g. "cnn"
    name        TEXT NOT NULL,
    domain      TEXT,
    country     CHAR(2),
    language    CHAR(5) DEFAULT 'en',
    logo_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Authors ──────────────────────────────────────────────
CREATE TABLE authors (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    author_url  TEXT UNIQUE,
    source_id   TEXT REFERENCES sources(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Articles ─────────────────────────────────────────────
CREATE TABLE articles (
    id                  TEXT PRIMARY KEY,     -- sha256[:16] of canonical URL
    url                 TEXT UNIQUE NOT NULL,
    canonical_url       TEXT,
    source_id           TEXT REFERENCES sources(id),
    author_id           BIGINT REFERENCES authors(id),
    title               TEXT NOT NULL,
    description         TEXT,
    content             TEXT,
    ai_summary          TEXT,
    url_to_image        TEXT,
    video_url           TEXT,
    topic               TEXT NOT NULL,        -- category
    section             TEXT,
    og_type             TEXT,
    language            CHAR(5) DEFAULT 'en',
    published_at        TIMESTAMPTZ,
    modified_at         TIMESTAMPTZ,
    scraped_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Sentiment
    sentiment_type      TEXT CHECK (sentiment_type IN ('positive','neutral','negative')),
    sentiment_score     NUMERIC(5,4),
    sentiment_polarity  NUMERIC(5,4),
    sentiment_pos       NUMERIC(5,4),
    sentiment_neu       NUMERIC(5,4),
    sentiment_neg       NUMERIC(5,4),
    sentiment_model     TEXT,
    -- Toxicity
    toxicity_label      TEXT,
    toxicity_score      NUMERIC(5,4),
    -- Readability
    word_count          INT,
    reading_time_min    INT,
    flesch_score        NUMERIC(6,2),
    flesch_kincaid      NUMERIC(6,2),
    smog_index          NUMERIC(6,2),
    -- AI enrichment
    ai_relevance        NUMERIC(5,4),
    ai_top_label        TEXT,
    -- Flags
    is_premium          BOOLEAN,
    is_accessible_free  BOOLEAN,
    -- JSONB blobs for flexible querying
    keywords            JSONB,               -- ["trump","economy",...]
    entities            JSONB,               -- {persons:[],orgs:[],locs:[],misc:[]}
    images              JSONB,               -- [{url,caption,is_primary},...]
    related_urls        JSONB,               -- ["https://...",...]
    og_data             JSONB,               -- {title,description,site_name,...}
    ai_label_scores     JSONB,               -- {sports:0.92, politics:0.05,...}
    meta_tags           JSONB,               -- ["tag1","tag2",...]
    raw_jsonld          JSONB,               -- full JSON-LD dump
    UNIQUE (canonical_url)
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX idx_articles_topic        ON articles (topic);
CREATE INDEX idx_articles_published    ON articles (published_at DESC);
CREATE INDEX idx_articles_sentiment    ON articles (sentiment_type);
CREATE INDEX idx_articles_source       ON articles (source_id);
CREATE INDEX idx_articles_language     ON articles (language);
CREATE INDEX idx_articles_scraped      ON articles (scraped_at DESC);
CREATE INDEX idx_articles_title_trgm   ON articles USING GIN (title gin_trgm_ops);
CREATE INDEX idx_articles_content_trgm ON articles USING GIN (content gin_trgm_ops);
CREATE INDEX idx_articles_keywords_gin ON articles USING GIN (keywords);
CREATE INDEX idx_articles_entities_gin ON articles USING GIN (entities);

-- ── Scrape runs ──────────────────────────────────────────
CREATE TABLE scrape_runs (
    id          BIGSERIAL PRIMARY KEY,
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    total       INT,
    by_category JSONB,
    ai_models   JSONB
);
"""

# ── Python insert helpers  (needs psycopg2 or asyncpg) ────────────
def pg_insert_article(conn, record: dict):
    """Insert one enriched article. Uses ON CONFLICT DO UPDATE (upsert)."""
    import psycopg2.extras as extras

    src  = record["source"]
    sent = record["sentiment"]
    tox  = record["toxicity"]
    read = record["readability"]
    og   = record["og"]

    # upsert source
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sources (id, name, domain, country, language, logo_url)
            VALUES (%(id)s,%(name)s,%(domain)s,%(country)s,%(language)s,%(logo_url)s)
            ON CONFLICT (id) DO NOTHING
        """, src)

    # upsert author
    author_id = None
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO authors (name, author_url, source_id)
            VALUES (%(name)s, %(url)s, %(source_id)s)
            ON CONFLICT (author_url) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, {"name": record["author"], "url": record.get("author_url"), "source_id": src["id"]})
        row = cur.fetchone()
        if row: author_id = row[0]

    # upsert article
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO articles (
                id, url, canonical_url, source_id, author_id,
                title, description, content, ai_summary,
                url_to_image, video_url, topic, section, og_type, language,
                published_at, modified_at, scraped_at,
                sentiment_type, sentiment_score, sentiment_polarity,
                sentiment_pos, sentiment_neu, sentiment_neg, sentiment_model,
                toxicity_label, toxicity_score,
                word_count, reading_time_min, flesch_score, flesch_kincaid, smog_index,
                ai_relevance, ai_top_label, is_premium, is_accessible_free,
                keywords, entities, images, related_urls, og_data, ai_label_scores, meta_tags
            ) VALUES (
                %(id)s, %(url)s, %(canonical_url)s, %(source_id)s, %(author_id)s,
                %(title)s, %(description)s, %(content)s, %(ai_summary)s,
                %(url_to_image)s, %(video_url)s, %(topic)s, %(section)s, %(og_type)s, %(language)s,
                %(published_at)s, %(modified_at)s, %(scraped_at)s,
                %(sentiment_type)s, %(sentiment_score)s, %(sentiment_polarity)s,
                %(sentiment_pos)s, %(sentiment_neu)s, %(sentiment_neg)s, %(sentiment_model)s,
                %(toxicity_label)s, %(toxicity_score)s,
                %(word_count)s, %(reading_time_min)s, %(flesch_score)s, %(flesch_kincaid)s, %(smog_index)s,
                %(ai_relevance)s, %(ai_top_label)s, %(is_premium)s, %(is_accessible_free)s,
                %(keywords)s, %(entities)s, %(images)s, %(related_urls)s, %(og_data)s, %(ai_label_scores)s, %(meta_tags)s
            )
            ON CONFLICT (canonical_url) DO UPDATE SET
                title            = EXCLUDED.title,
                description      = EXCLUDED.description,
                content          = EXCLUDED.content,
                ai_summary       = EXCLUDED.ai_summary,
                sentiment_type   = EXCLUDED.sentiment_type,
                sentiment_score  = EXCLUDED.sentiment_score,
                sentiment_polarity = EXCLUDED.sentiment_polarity,
                keywords         = EXCLUDED.keywords,
                scraped_at       = EXCLUDED.scraped_at
        """, {
            "id":                  record["id"],
            "url":                 record["url"],
            "canonical_url":       record["canonical_url"],
            "source_id":           src["id"],
            "author_id":           author_id,
            "title":               record["title"],
            "description":         record.get("description"),
            "content":             record.get("content"),
            "ai_summary":          record.get("ai_summary"),
            "url_to_image":        record.get("url_to_image"),
            "video_url":           record.get("video_url"),
            "topic":               record["topic"],
            "section":             record.get("section"),
            "og_type":             record.get("og_type"),
            "language":            record.get("language","en"),
            "published_at":        record.get("published_at"),
            "modified_at":         record.get("modified_at"),
            "scraped_at":          record.get("scraped_at"),
            "sentiment_type":      sent["type"],
            "sentiment_score":     sent["score"],
            "sentiment_polarity":  sent["comparative"],
            "sentiment_pos":       sent["probabilities"]["positive"],
            "sentiment_neu":       sent["probabilities"]["neutral"],
            "sentiment_neg":       sent["probabilities"]["negative"],
            "sentiment_model":     sent["model"],
            "toxicity_label":      tox["label"],
            "toxicity_score":      tox["score"],
            "word_count":          read["word_count"],
            "reading_time_min":    read["reading_time_min"],
            "flesch_score":        read["flesch_score"],
            "flesch_kincaid":      read["flesch_kincaid"],
            "smog_index":          read["smog_index"],
            "ai_relevance":        record.get("ai_relevance"),
            "ai_top_label":        record.get("ai_top_label"),
            "is_premium":          record.get("is_premium"),
            "is_accessible_free":  record.get("is_accessible_free"),
            "keywords":            extras.Json(record.get("keywords",[])),
            "entities":            extras.Json(record.get("entities",{})),
            "images":              extras.Json(record.get("images",[])),
            "related_urls":        extras.Json(record.get("related_urls",[])),
            "og_data":             extras.Json(og),
            "ai_label_scores":     extras.Json(record.get("ai_label_scores",{})),
            "meta_tags":           extras.Json(record.get("meta_tags",[])),
        })
    conn.commit()


def pg_insert_all(dsn: str, articles: list[dict]):
    """Bulk insert. dsn example: 'postgresql://user:pass@localhost/newsdb'"""
    import psycopg2
    conn = psycopg2.connect(dsn)
    ok = 0
    for art in articles:
        try:
            pg_insert_article(conn, art)
            ok += 1
        except Exception as e:
            conn.rollback()
            print(f"   ⚠️  DB insert error: {e}")
    conn.close()
    print(f"\n🐘 PostgreSQL: {ok}/{len(articles)} articles inserted.")


# ── Uncomment to use: ──────────────────────────────────────────────
# pg_insert_all("postgresql://user:pass@localhost/newsdb", final_data)
