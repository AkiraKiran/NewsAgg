"""URL / domain helpers, article-URL pattern matching, freshness, dedup keys.

Pure functions — no network, no ML. This is the "is this a real, fresh,
in-scope article URL?" layer plus small text-cleaning utilities.
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse

from core import config


# ── Domain identity ─────────────────────────────────────────────────
def dom(url: str) -> str:
    return urlparse(url).netloc.lower()


def is_cnn(u: str) -> bool:
    return "cnn.com" in dom(u)


def is_bbc(u: str) -> bool:
    return "bbc.com" in dom(u)


def is_alj(u: str) -> bool:
    return "aljazeera.com" in dom(u)


def is_yahoo_tw(u: str) -> bool:
    d = dom(u)
    return "tw.news.yahoo.com" in d or (d.endswith("yahoo.com") and d.startswith("tw."))


def source_meta(url: str) -> dict:
    """Map a URL to its source identity row (matches the live `sources` table)."""
    d = dom(url)
    if "cnn.com" in d:
        return {"id": "cnn", "name": "CNN", "domain": "edition.cnn.com", "country": "US", "language": "en", "logo": "https://edition.cnn.com/media/sites/cnn/favicon.ico"}
    if "bbc.com" in d:
        return {"id": "bbc", "name": "BBC", "domain": "bbc.com", "country": "GB", "language": "en", "logo": "https://www.bbc.com/favicon.ico"}
    if "aljazeera.com" in d:
        return {"id": "aljazeera", "name": "Al Jazeera", "domain": "aljazeera.com", "country": "QA", "language": "en", "logo": "https://www.aljazeera.com/favicon.ico"}
    if "yahoo.com" in d:
        return {"id": "yahoo_tw", "name": "Yahoo TW", "domain": "tw.news.yahoo.com", "country": "TW", "language": "zh-TW", "logo": "https://tw.news.yahoo.com/favicon.ico"}
    return {"id": d, "name": d, "domain": d, "country": None, "language": "en", "logo": None}


# ── URL normalisation / ids ─────────────────────────────────────────
def make_abs(href: str, base: str) -> str:
    p = urlparse(href)
    if p.scheme:
        return href.split("?")[0].split("#")[0]
    return urljoin(base, href).split("?")[0].split("#")[0]


def url_id(url: str) -> str:
    """Stable article id used as the primary key in the live DB (sha256[:16])."""
    return hashlib.sha256(url.encode()).hexdigest()[:16]


SITE_FAMILIES = [
    {"cnn.com"},
    {"bbc.com", "bbc.co.uk"},
    {"aljazeera.com"},
    {"yahoo.com"},
]


def same_family(u: str, base: str) -> bool:
    sd, ud = dom(base), dom(u)
    for fam in SITE_FAMILIES:
        if any(x in sd for x in fam):
            return any(x in ud for x in fam)
    return sd == ud


# ── Article-URL patterns ────────────────────────────────────────────
_CNN_INC = re.compile(r"/\d{4}/\d{2}/\d{2}/")
_CNN_EXC = re.compile(r"/video/|/gallery/|/live-updates/|/cnn-underscored/|/vr/|/weather/")
_BBC_INC = re.compile(
    r"/articles/[a-z0-9]"
    r"|/article/\d{8}"
    r"|/(sport|health|future|travel|business|arts|technology|news|science|culture|worklife|food|reel|earth)/[a-z0-9][a-z0-9-]+-\d{4,}"
)
_BBC_EXC = re.compile(r"/av/|/live/|/iplayer/|\.jpg$|\.png$|/election/results|/sounds/")
_AJ_INC = re.compile(r"/\d{4}/\d{1,2}/\d{1,2}/")
_AJ_EXC = re.compile(r"/video/|/gallery/|/podcast/|/program/|/liveblog/|/where-to-watch/")
_YAHOO_INC = re.compile(r"-\d{6,}\.html$|/[a-z0-9-]+-\d{6,}\.html")
_YAHOO_EXC = re.compile(r"/video/|/live/|/photos/")

# Junk anchor / photo-credit noise.
JUNK = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|file photo|@\w+/|/x$|\.com$|\.space|\bfile\b)", re.I)
PHOTO_RE = re.compile(r"(getty|reuters|ap photo|shutterstock|afp|\/file|@\w+)", re.I)


def is_article_url(url: str) -> bool:
    if is_cnn(url):
        return bool(_CNN_INC.search(url)) and not _CNN_EXC.search(url)
    if is_bbc(url):
        return bool(_BBC_INC.search(url)) and not _BBC_EXC.search(url)
    if is_alj(url):
        return bool(_AJ_INC.search(url)) and not _AJ_EXC.search(url)
    if is_yahoo_tw(url):
        return bool(_YAHOO_INC.search(url)) and not _YAHOO_EXC.search(url)
    return bool(re.search(r"/\d{4}/\d{2}/\d{2}/", url))


# ── Freshness ───────────────────────────────────────────────────────
def date_from_url(url: str) -> Optional[datetime]:
    m = re.search(r"/(\d{4})/(\d{1,2})/(\d{1,2})/", url)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=timezone.utc)
        except Exception:
            pass
    return None


def is_fresh(url: str, published: Optional[datetime]) -> bool:
    if config.MAX_AGE_DAYS is None:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=config.MAX_AGE_DAYS)
    dt = published or date_from_url(url)
    if dt is None:
        return True            # unknown date — include optimistically
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt >= cutoff


# ── Text cleaning ───────────────────────────────────────────────────
def clean_text(text: str) -> str:
    """Collapse whitespace and strip control noise from scraped body text."""
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
