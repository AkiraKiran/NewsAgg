# ╔══════════════════════════════════════════════════════════════════╗
# ║  News Scraper — Google Colab T4 Edition                         ║
# ║  Runtime: GPU (T4) · Python 3.10+                               ║
# ║  Before running: Runtime → Change runtime type → T4 GPU         ║
# ╚══════════════════════════════════════════════════════════════════╝

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 1 — Install dependencies
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# !pip install -q \
#     newspaper3k \
#     transformers \
#     torch \
#     sentencepiece \
#     protobuf \
#     langdetect \
#     textstat \
#     beautifulsoup4 \
#     requests \
#     lxml \
#     nltk \
#     psycopg2-binary \
#     accelerate

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 2 — Imports & GPU check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import os, re, json, string, time, hashlib, logging
from collections  import Counter, defaultdict
from datetime     import datetime, timezone, timedelta
from pathlib      import Path
from typing       import Optional
from urllib.parse import urljoin, urlparse

import requests as _req
from bs4          import BeautifulSoup
from newspaper    import Article, Config
from transformers import pipeline
import torch
import nltk
from nltk.corpus  import stopwords as _sw
import langdetect
import textstat

# ── GPU detection ──────────────────────────────────────────────────
DEVICE      = 0 if torch.cuda.is_available() else -1   # 0 = first GPU, -1 = CPU
DEVICE_NAME = torch.cuda.get_device_name(0) if DEVICE == 0 else "CPU"
print(f"🖥️  Device: {DEVICE_NAME}")

nltk.download("punkt",     quiet=True)
nltk.download("punkt_tab", quiet=True)
nltk.download("stopwords", quiet=True)

logging.basicConfig(level=logging.WARNING)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 3 — Credentials
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Option A: Colab Secrets (recommended)
#   Left sidebar → 🔑 Secrets → add HF_TOKEN and NEON_DSN
try:
    from google.colab import userdata
    HF_TOKEN = userdata.get("HF_TOKEN")
    NEON_DSN = userdata.get("NEON_DSN")   # e.g. "postgresql://user:pass@host/db"
except Exception:
    HF_TOKEN = os.getenv("HF_TOKEN", "")
    NEON_DSN = os.getenv("NEON_DSN", "")

if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN missing. Add it via Colab Secrets (🔑) or set the env var.")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 4 — Load AI models  (all on GPU via device=DEVICE)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("⚙️  Loading AI models …")

_sent_general = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    truncation=True, max_length=512, top_k=None,
    device=DEVICE,
)

_sent_finance = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert",
    truncation=True, max_length=512, top_k=None,
    device=DEVICE,
)

_classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
    token=HF_TOKEN,
    device=DEVICE,
)

_ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple",
    device=DEVICE,
)

# Summariser — optional; graceful fallback if task is unavailable
_summariser = None
try:
    _summariser = pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
        truncation=True,
        device=DEVICE,
    )
    print("   ✅ Summariser loaded")
except Exception as e:
    logging.warning(f"Summariser unavailable, using extractive fallback: {e}")

_toxicity = pipeline(
    "text-classification",
    model="unitary/toxic-bert",
    truncation=True, max_length=512,
    device=DEVICE,
)

print(f"✅ All models loaded on {DEVICE_NAME}\n")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 5 — Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_np_cfg = Config()
_np_cfg.browser_user_agent = USER_AGENT
_np_cfg.request_timeout    = 15

MAX_AGE_DAYS        = 60
TARGET_PER_CATEGORY = 50
CRAWL_MULT          = 3
MIN_TEXT_LEN        = 300
ZS_THRESHOLD        = 0.38
RATE_LIMIT: dict[str, float] = defaultdict(float)
RATE_DELAY          = 1.2

STOP_WORDS = set(_sw.words("english"))

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
    "Business": "finance", "Sport": "general", "Health": "general",
    "Travel": "general",   "World": "general",  "Entertainment": "general",
    "Science": "general",  "Politics": "general",
}
SENTIMENT_MODELS = {"general": _sent_general, "finance": _sent_finance}

NEUTRAL_THRESHOLD    = 0.52
NEUTRAL_POLARITY_CAP = 0.18
POLARITY_MARGIN      = 0.10

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 6 — Domain / URL helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _dom(url: str) -> str:
    return urlparse(url).netloc.lower()

def _is_cnn(u): return "cnn.com"       in _dom(u)
def _is_bbc(u): return "bbc.com"       in _dom(u)
def _is_alj(u): return "aljazeera.com" in _dom(u)

def source_meta(url: str) -> dict:
    d = _dom(url)
    if "cnn.com"       in d: return {"id":"cnn",       "name":"CNN",        "domain":"edition.cnn.com","country":"US","language":"en","logo":"https://edition.cnn.com/media/sites/cnn/favicon.ico"}
    if "bbc.com"       in d: return {"id":"bbc",       "name":"BBC",        "domain":"bbc.com",        "country":"GB","language":"en","logo":"https://www.bbc.com/favicon.ico"}
    if "aljazeera.com" in d: return {"id":"aljazeera", "name":"Al Jazeera", "domain":"aljazeera.com",  "country":"QA","language":"en","logo":"https://www.aljazeera.com/favicon.ico"}
    return {"id":d,"name":d,"domain":d,"country":None,"language":"en","logo":None}

def make_abs(href: str, base: str) -> str:
    p = urlparse(href)
    if p.scheme: return href.split("?")[0].split("#")[0]
    return urljoin(base, href).split("?")[0].split("#")[0]

def url_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]

SITE_FAMILIES = [{"cnn.com"}, {"bbc.com","bbc.co.uk"}, {"aljazeera.com"}]

def same_family(u: str, base: str) -> bool:
    sd, ud = _dom(base), _dom(u)
    for f in SITE_FAMILIES:
        if any(x in sd for x in f): return any(x in ud for x in f)
    return sd == ud

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
_JUNK    = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|file photo|@\w+/|/x$|\.com$|\.space|\bfile\b)", re.I)

def is_article_url(url: str) -> bool:
    if _is_cnn(url): return bool(_CNN_INC.search(url)) and not _CNN_EXC.search(url)
    if _is_bbc(url): return bool(_BBC_INC.search(url)) and not _BBC_EXC.search(url)
    if _is_alj(url): return bool(_AJ_INC.search(url))  and not _AJ_EXC.search(url)
    return bool(re.search(r"/\d{4}/\d{2}/\d{2}/", url))

def date_from_url(url: str) -> Optional[datetime]:
    m = re.search(r"/(\d{4})/(\d{1,2})/(\d{1,2})/", url)
    if m:
        try: return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=timezone.utc)
        except Exception: pass
    return None

def is_fresh(url: str, published: Optional[datetime]) -> bool:
    if MAX_AGE_DAYS is None: return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    dt = published or date_from_url(url)
    if dt is None: return True
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt >= cutoff

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 7 — Rate-limited HTTP session
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_SESSION = _req.Session()
_SESSION.headers.update({"User-Agent": USER_AGENT})

def _get(url: str, timeout: int = 15) -> Optional[_req.Response]:
    dom  = _dom(url)
    wait = RATE_LIMIT[dom] - time.time()
    if wait > 0: time.sleep(wait)
    try:
        r = _SESSION.get(url, timeout=timeout)
        RATE_LIMIT[dom] = time.time() + RATE_DELAY
        r.raise_for_status()
        return r
    except Exception as e:
        logging.debug(f"GET failed {url}: {e}")
        return None

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 8 — OG / JSON-LD / Meta extraction
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def extract_og(soup: BeautifulSoup, url: str) -> dict:
    def og(prop):
        tag = soup.find("meta", {"property": f"og:{prop}"}) or \
              soup.find("meta", {"name": f"og:{prop}"})
        return tag["content"].strip() if tag and tag.get("content") else None

    def tw(name):
        tag = soup.find("meta", {"name": f"twitter:{name}"})
        return tag["content"].strip() if tag and tag.get("content") else None

    canon = None
    ctag  = soup.find("link", {"rel": "canonical"})
    if ctag and ctag.get("href"): canon = ctag["href"].strip()

    pub = None
    for attr in [("property","article:published_time"),("name","pubdate"),("itemprop","datePublished"),("name","date")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"): pub = tag["content"].strip(); break

    mod = None
    for attr in [("property","article:modified_time"),("itemprop","dateModified")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"): mod = tag["content"].strip(); break

    tags = []
    kw_tag = soup.find("meta", {"name": re.compile(r"keywords|news_keywords", re.I)})
    if kw_tag and kw_tag.get("content"):
        tags = [t.strip() for t in kw_tag["content"].split(",") if t.strip()]

    section = None
    for attr in [("property","article:section"),("name","section")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"): section = tag["content"].strip(); break

    images    = []
    main_img  = og("image")
    if main_img:
        caption = None
        try:
            fig = soup.find("figure")
            if fig:
                cap = fig.find("figcaption")
                if cap: caption = cap.get_text(strip=True)[:300]
        except Exception: pass
        images.append({"url": main_img, "caption": caption, "is_primary": True})

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
            if isinstance(data, list): items.extend(data)
            else: items.append(data)
        except Exception: pass
    return items

def jsonld_article(items: list[dict]) -> dict:
    result = {}
    for item in items:
        t = item.get("@type","")
        if not isinstance(t, str): t = " ".join(t) if isinstance(t, list) else str(t)
        if not any(x in t for x in ("Article","NewsArticle","BlogPosting","ReportageNewsArticle")): continue
        result["jsonld_headline"]             = item.get("headline")
        result["jsonld_description"]          = item.get("description")
        result["jsonld_datePublished"]         = item.get("datePublished")
        result["jsonld_dateModified"]          = item.get("dateModified")
        result["jsonld_isAccessibleForFree"]   = item.get("isAccessibleForFree")
        result["jsonld_isPremium"]             = item.get("isPremium")
        result["jsonld_genre"]                 = item.get("genre")
        result["jsonld_wordCount"]             = item.get("wordCount")
        auth = item.get("author")
        if isinstance(auth, dict):
            result["jsonld_author_name"] = auth.get("name")
            result["jsonld_author_url"]  = auth.get("url") or auth.get("sameAs")
        elif isinstance(auth, list) and auth:
            result["jsonld_author_name"] = ", ".join(a.get("name","") for a in auth if isinstance(a, dict))
        pub = item.get("publisher")
        if isinstance(pub, dict): result["jsonld_publisher"] = pub.get("name")
        img = item.get("image")
        if isinstance(img, dict): result["jsonld_image"] = img.get("url")
        elif isinstance(img, str): result["jsonld_image"] = img
        break
    return result

def extract_video(soup: BeautifulSoup, url: str, jsonld_items: list[dict]) -> Optional[str]:
    for item in jsonld_items:
        t = item.get("@type","")
        if "VideoObject" in str(t) or "MediaObject" in str(t):
            v = item.get("contentUrl") or item.get("embedUrl")
            if v: return v
    og_v = soup.find("meta", {"property":"og:video"})
    if og_v and og_v.get("content"): return og_v["content"]
    tw_v = soup.find("meta", {"name":"twitter:player"})
    if tw_v and tw_v.get("content"): return tw_v["content"]
    if _is_cnn(url):
        vd = soup.find(attrs={"data-video-slug": True})
        if vd:
            s = vd.get("data-video-slug","")
            if s: return f"https://edition.cnn.com/videos/{s}"
    if _is_bbc(url):
        fi = soup.find("iframe", {"src": re.compile(r"bbc\.co\.uk/news/av-embeds|player\.bbc\.com")})
        if fi and fi.get("src"): return fi["src"]
    return None

def extract_related(soup: BeautifulSoup, url: str) -> list[str]:
    related, seen  = [], set()
    body_tags = soup.find_all("article") or [soup]
    for container in body_tags:
        for a in container.find_all("a", href=True):
            href = make_abs(a["href"], url)
            if href not in seen and same_family(href, url) and is_article_url(href) and href != url:
                related.append(href); seen.add(href)
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
    except Exception: pass
    return {"name": name or "Unknown", "url": aurl}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 9 — AI helpers (sentiment / summary / keywords)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def build_ai_summary(text: str) -> Optional[str]:
    chunk = text[:1024]
    if len(chunk.split()) <= 50: return None
    if _summariser is not None:
        try:
            out = _summariser(chunk, max_length=80, min_length=30, do_sample=False)
            return out[0]["summary_text"]
        except Exception: pass
    # Extractive fallback
    sentences = re.split(r"(?<=[.!?])\s+", chunk.strip())
    fallback  = " ".join(sentences[:3]).strip()
    if len(fallback) > 420: fallback = fallback[:420].rsplit(" ", 1)[0] + "..."
    return fallback or None

def _norm_label(raw: str) -> str:
    s = str(raw).strip().lower()
    if "pos" in s: return "positive"
    if "neg" in s: return "negative"
    if "neu" in s: return "neutral"
    return {"label_0":"negative","label_1":"neutral","label_2":"positive"}.get(s,"neutral")

def _extract_probs(raw) -> dict:
    probs = {"positive":0.0,"neutral":0.0,"negative":0.0}
    rows  = raw
    if isinstance(rows, list) and rows and isinstance(rows[0], list): rows = rows[0]
    for e in rows:
        if not isinstance(e, dict): continue
        k = _norm_label(e.get("label","neutral"))
        try: probs[k] = max(0.0, min(1.0, float(e["score"])))
        except Exception: pass
    total = sum(probs.values())
    if total > 0: probs = {k: v/total for k, v in probs.items()}
    return probs

def _classify(probs: dict) -> tuple:
    pos, neu, neg = probs["positive"], probs["neutral"], probs["negative"]
    pol = pos - neg
    if neu >= NEUTRAL_THRESHOLD and abs(pol) <= NEUTRAL_POLARITY_CAP: label = "neutral"
    elif pol >=  POLARITY_MARGIN: label = "positive"
    elif pol <= -POLARITY_MARGIN: label = "negative"
    else: label = max(probs, key=probs.get)
    return label, round(probs[label], 4), round(pol, 4)

def extract_keywords(text: str, np_kw: list, entities: dict, top_n: int = 30) -> list[str]:
    combined: dict[str, int] = {}
    for kw in np_kw:
        k = kw.lower().strip()
        if len(k) > 3 and k not in STOP_WORDS: combined[k] = combined.get(k, 0) + 3
    for elist in entities.values():
        for ent in elist:
            for tok in ent.lower().split():
                tok = tok.strip(string.punctuation)
                if len(tok) > 3 and tok not in STOP_WORDS: combined[tok] = combined.get(tok, 0) + 2
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq  = Counter(w for w in words if w not in STOP_WORDS)
    for w, cnt in freq.most_common(80):
        if w not in combined: combined[w] = cnt
    seen, result = set(), []
    for kw, _ in sorted(combined.items(), key=lambda x: -x[1]):
        if kw not in seen: seen.add(kw); result.append(kw)
        if len(result) >= top_n: break
    return result

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
    try: return langdetect.detect(text[:1000])
    except Exception: return "en"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 10 — Crawl candidates from one source URL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def crawl_source(source_url: str, category: str, max_cand: int) -> list[dict]:
    results, seen = [], set()
    print(f"  🔍 {source_url}")
    r = _get(source_url)
    if not r: print("     ❌ failed"); return []
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup.find_all("a", href=True):
        url = make_abs(tag["href"], source_url)
        if not same_family(url, source_url) or not is_article_url(url) or url in seen: continue
        hint = tag.get("aria-label","").strip()
        if not hint:
            for tn in ["h1","h2","h3","h4","span","p"]:
                el = tag.find(tn)
                if el:
                    cand = el.get_text(strip=True)
                    if len(cand) >= 20 and not _JUNK.search(cand): hint = cand; break
        if not hint:
            raw = tag.get_text(strip=True)
            if len(raw) >= 20 and not _JUNK.search(raw): hint = raw
        if not hint: continue
        seen.add(url)
        results.append({"url": url, "topic": category, "title_hint": hint, "source_url": source_url})
        if len(results) >= max_cand: break
    print(f"     → {len(results)} candidates")
    return results

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 11 — AI filter (zero-shot batch)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_PHOTO_RE = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|\/file|@\w+)", re.I)

def ai_filter(candidates: list[dict], threshold: float = ZS_THRESHOLD) -> list[dict]:
    if not candidates: return []
    valid, titles = [], []
    for item in candidates:
        t = item["title_hint"]
        if not _PHOTO_RE.search(t) and len(t) >= 15: valid.append(item); titles.append(t)
    if not valid: return []
    labels = CATEGORY_LABELS[valid[0]["topic"]]
    try:
        out = _classifier(titles, candidate_labels=labels, multi_label=True)
        if isinstance(out, dict): out = [out]
        result = []
        for item, res in zip(valid, out):
            if res["scores"][0] >= threshold:
                item["ai_relevance_score"] = round(res["scores"][0], 4)
                item["ai_top_label"]       = res["labels"][0]
                item["ai_label_scores"]    = dict(zip(res["labels"][:5], [round(s,4) for s in res["scores"][:5]]))
                result.append(item)
        return result
    except Exception as e:
        print(f"  ⚠️  ZS filter error: {e}")
        return valid

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 12 — Full article enrich
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def enrich_article(item: dict) -> Optional[dict]:
    url, topic = item["url"], item["topic"]
    print(f"⚙️  [{topic}] {url}")
    try:
        art = Article(url, config=_np_cfg)
        art.download(); art.parse(); art.nlp()
        text = art.text.strip()
        if len(text) < MIN_TEXT_LEN: print("   ⚠️  Too short\n"); return None

        pub_dt = art.publish_date
        if not is_fresh(url, pub_dt): print("   ⚠️  Too old\n"); return None

        r    = _get(url, timeout=12)
        soup = BeautifulSoup(r.text if r else "", "html.parser")

        jsonld_items = extract_jsonld(soup)
        jsonld       = jsonld_article(jsonld_items)
        og_data      = extract_og(soup, url)
        video_url    = extract_video(soup, url, jsonld_items)
        related_urls = extract_related(soup, url)
        author_info  = extract_author(soup, url, art.authors, jsonld)

        # NER
        raw_ents = _ner(text[:1500])
        entities = {"persons":[], "organizations":[], "locations":[], "misc":[]}
        type_map = {"PER":"persons","ORG":"organizations","LOC":"locations","MISC":"misc"}
        for ent in raw_ents:
            key = type_map.get(ent["entity_group"])
            if key and ent["word"] not in entities[key]: entities[key].append(ent["word"])

        # Sentiment
        model_key  = SENTIMENT_MODEL_MAP.get(topic, "general")
        raw_sent   = SENTIMENT_MODELS[model_key](text[:1500])
        probs      = _extract_probs(raw_sent)
        s_label, s_conf, s_pol = _classify(probs)

        # Summary
        ai_summary = build_ai_summary(text)

        # Toxicity
        toxicity_score, toxicity_label = 0.0, "non-toxic"
        try:
            tox = _toxicity(text[:512])
            if isinstance(tox, list) and tox:
                toxicity_label = tox[0].get("label","non-toxic").lower()
                toxicity_score = round(float(tox[0].get("score", 0.0)), 4)
        except Exception: pass

        # Keywords + readability
        keywords    = extract_keywords(text, art.keywords or [], entities, top_n=30)
        readability = reading_metrics(text)
        language    = detect_language(text)

        desc = (
            og_data.get("og_description")
            or jsonld.get("jsonld_description")
            or art.summary.strip()
            or text[:300] + "..."
        )

        pub_iso = None
        if pub_dt:
            if pub_dt.tzinfo is None: pub_dt = pub_dt.replace(tzinfo=timezone.utc)
            pub_iso = pub_dt.isoformat()
        pub_iso = pub_iso or og_data.get("published_meta") or jsonld.get("jsonld_datePublished") or datetime.now(timezone.utc).isoformat()
        mod_iso = og_data.get("modified_meta") or jsonld.get("jsonld_dateModified")
        canonical = og_data.get("canonical_url") or url

        record = {
            "id":               url_id(canonical),
            "url":              url,
            "canonical_url":    canonical,
            "source":           source_meta(url),
            "author":           author_info["name"],
            "author_url":       author_info["url"],
            "title":            art.title or og_data.get("og_title") or jsonld.get("jsonld_headline","Untitled"),
            "description":      desc,
            "content":          text,
            "ai_summary":       ai_summary,
            "url_to_image":     art.top_image or jsonld.get("jsonld_image"),
            "images":           og_data.get("images", []),
            "video_url":        video_url,
            "published_at":     pub_iso,
            "modified_at":      mod_iso,
            "scraped_at":       datetime.now(timezone.utc).isoformat(),
            "topic":            topic,
            "section":          og_data.get("section") or jsonld.get("jsonld_genre"),
            "meta_tags":        og_data.get("meta_tags", []),
            "og_type":          og_data.get("og_type"),
            "language":         language,
            "sentiment": {
                "type":        s_label,
                "score":       s_conf,
                "comparative": s_pol,
                "probabilities": {
                    "positive": round(probs["positive"], 4),
                    "neutral":  round(probs["neutral"],  4),
                    "negative": round(probs["negative"], 4),
                },
                "model": model_key,
            },
            "toxicity":         {"label": toxicity_label, "score": toxicity_score},
            "keywords":         keywords,
            "entities":         entities,
            "readability":      readability,
            "related_urls":     related_urls,
            "ai_relevance":     item.get("ai_relevance_score", 1.0),
            "ai_top_label":     item.get("ai_top_label"),
            "ai_label_scores":  item.get("ai_label_scores", {}),
            "is_premium":       jsonld.get("jsonld_isPremium"),
            "is_accessible_free": jsonld.get("jsonld_isAccessibleForFree"),
            "jsonld_word_count":  jsonld.get("jsonld_wordCount"),
            "og": {
                "title":        og_data.get("og_title"),
                "description":  og_data.get("og_description"),
                "site_name":    og_data.get("og_site_name"),
                "locale":       og_data.get("og_locale"),
                "twitter_card": og_data.get("twitter_card"),
                "twitter_site": og_data.get("twitter_site"),
            },
        }

        print(
            f"   ✅ {s_label.upper()} | conf={s_conf:.2f} | pol={s_pol:+.2f} | "
            f"kw={len(keywords)} | wc={readability['word_count']} | "
            f"{'📹 ' if video_url else ''}{'🔒 ' if record['is_premium'] else ''}\n"
        )
        return record

    except Exception as e:
        print(f"   ❌ {e}\n"); return None

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 13 — PostgreSQL upsert helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def pg_insert_article(conn, record: dict):
    import psycopg2.extras as extras
    src  = record["source"]
    sent = record["sentiment"]
    tox  = record["toxicity"]
    read = record["readability"]
    og   = record["og"]

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sources (id, name, domain, country, language, logo_url)
            VALUES (%(id)s,%(name)s,%(domain)s,%(country)s,%(language)s,%(logo)s)
            ON CONFLICT (id) DO NOTHING
        """, {**src, "logo": src.get("logo")})

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
                keywords, entities, images, related_urls,
                og_data, ai_label_scores, meta_tags
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
                %(keywords)s, %(entities)s, %(images)s, %(related_urls)s,
                %(og_data)s, %(ai_label_scores)s, %(meta_tags)s
            )
            ON CONFLICT (canonical_url) DO UPDATE SET
                title              = EXCLUDED.title,
                description        = EXCLUDED.description,
                content            = EXCLUDED.content,
                ai_summary         = EXCLUDED.ai_summary,
                sentiment_type     = EXCLUDED.sentiment_type,
                sentiment_score    = EXCLUDED.sentiment_score,
                sentiment_polarity = EXCLUDED.sentiment_polarity,
                keywords           = EXCLUDED.keywords,
                scraped_at         = EXCLUDED.scraped_at
        """, {
            "id":                record["id"],
            "url":               record["url"],
            "canonical_url":     record["canonical_url"],
            "source_id":         src["id"],
            "author_id":         author_id,
            "title":             record["title"],
            "description":       record.get("description"),
            "content":           record.get("content"),
            "ai_summary":        record.get("ai_summary"),
            "url_to_image":      record.get("url_to_image"),
            "video_url":         record.get("video_url"),
            "topic":             record["topic"],
            "section":           record.get("section"),
            "og_type":           record.get("og_type"),
            "language":          record.get("language", "en"),
            "published_at":      record.get("published_at"),
            "modified_at":       record.get("modified_at"),
            "scraped_at":        record.get("scraped_at"),
            "sentiment_type":    sent["type"],
            "sentiment_score":   sent["score"],
            "sentiment_polarity":sent["comparative"],
            "sentiment_pos":     sent["probabilities"]["positive"],
            "sentiment_neu":     sent["probabilities"]["neutral"],
            "sentiment_neg":     sent["probabilities"]["negative"],
            "sentiment_model":   sent["model"],
            "toxicity_label":    tox["label"],
            "toxicity_score":    tox["score"],
            "word_count":        read["word_count"],
            "reading_time_min":  read["reading_time_min"],
            "flesch_score":      read["flesch_score"],
            "flesch_kincaid":    read["flesch_kincaid"],
            "smog_index":        read["smog_index"],
            "ai_relevance":      record.get("ai_relevance"),
            "ai_top_label":      record.get("ai_top_label"),
            "is_premium":        record.get("is_premium"),
            "is_accessible_free":record.get("is_accessible_free"),
            "keywords":          extras.Json(record.get("keywords", [])),
            "entities":          extras.Json(record.get("entities", {})),
            "images":            extras.Json(record.get("images", [])),
            "related_urls":      extras.Json(record.get("related_urls", [])),
            "og_data":           extras.Json(og),
            "ai_label_scores":   extras.Json(record.get("ai_label_scores", {})),
            "meta_tags":         extras.Json(record.get("meta_tags", [])),
        })
    conn.commit()


def pg_insert_all(dsn: str, articles: list[dict]) -> int:
    import psycopg2
    conn = psycopg2.connect(dsn)
    ok   = 0
    for art in articles:
        try:
            pg_insert_article(conn, art)
            ok += 1
        except Exception as e:
            conn.rollback()
            print(f"   ⚠️  DB insert error: {e}")
    conn.close()
    print(f"\n🐘 PostgreSQL: {ok}/{len(articles)} articles inserted.")
    return ok

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 14 — Main pipeline  (Crawl → AI filter → Enrich → Save)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
final_data:  list[dict] = []
global_seen: set        = set()

print("=" * 70)
print("PHASE 1-3 — CRAWL → AI FILTER → ENRICH  (target: 50 per category)")
print("=" * 70)

for category, source_urls in SOURCE_CATEGORIES.items():
    print(f"\n{'─'*60}\n  CATEGORY: {category}\n{'─'*60}")

    per_src_target = max(20, (TARGET_PER_CATEGORY * CRAWL_MULT) // len(source_urls))

    raw_pool: list[dict] = []
    for src in source_urls:
        raw_pool.extend(crawl_source(src, category, per_src_target))

    deduped: dict[str, dict] = {}
    for item in raw_pool:
        if item["url"] not in deduped: deduped[item["url"]] = item
    raw_pool = list(deduped.values())

    validated = ai_filter(raw_pool)

    def _url_date_key(item):
        d = date_from_url(item["url"])
        return d.timestamp() if d else 0.0

    validated.sort(key=lambda x: (-x.get("ai_relevance_score", 0), -_url_date_key(x)))

    cat_articles: list[dict] = []
    for item in validated:
        if len(cat_articles) >= TARGET_PER_CATEGORY: break
        if item["url"] in global_seen: continue
        record = enrich_article(item)
        if record is None: continue
        ckey = record["canonical_url"]
        if ckey in global_seen: continue
        global_seen.add(ckey)
        cat_articles.append(record)

    final_data.extend(cat_articles)
    print(f"  📦 {category}: {len(cat_articles)} articles collected")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 15 — Save JSON to Colab + download
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

OUTPUT_PATH = Path("/content/news_data.json")
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False, default=str)

print(f"\n✅ JSON saved → {OUTPUT_PATH}  ({OUTPUT_PATH.stat().st_size / 1024:.1f} KB)")

# Auto-download in Colab
try:
    from google.colab import files
    files.download(str(OUTPUT_PATH))
except Exception:
    pass  # not in Colab, skip

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 16 — PostgreSQL insert  (skipped if NEON_DSN not set)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if NEON_DSN:
    pg_insert_all(NEON_DSN, final_data)
else:
    print("ℹ️  NEON_DSN not set — skipping PostgreSQL insert.")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 17 — Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
by_cat  = Counter(a["topic"]              for a in final_data)
by_sent = Counter(a["sentiment"]["type"]  for a in final_data)
n_vid   = sum(1 for a in final_data if a.get("video_url"))
n_auth  = sum(1 for a in final_data if a.get("author_url"))
n_prem  = sum(1 for a in final_data if a.get("is_premium"))
n_summ  = sum(1 for a in final_data if a.get("ai_summary"))

print("\n" + "="*70)
print(f"✅  {len(final_data)} articles total")
print("="*70)
print("\n📊 By category:")
for cat, n in sorted(by_cat.items()): print(f"   {cat:<16} {n}")
print("\n📊 By sentiment:")
for s, n in by_sent.items():          print(f"   {s:<12} {n}")
print(f"\n📹 With video        : {n_vid}")
print(f"👤 With author URL   : {n_auth}")
print(f"🔒 Premium articles  : {n_prem}")
print(f"🤖 AI summaries      : {n_summ}")
print(f"🖥️  Ran on           : {DEVICE_NAME}")