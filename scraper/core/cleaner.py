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


def normalize_canonical(url: str) -> str:
    """Canonical form used as the dedup key: lowercase host, no query string,
    no fragment, no trailing slash. Publishers vary tracking params and case
    on the same story; without this the same article gets a new url_id."""
    if not url:
        return url
    p = urlparse(url)
    host = (p.netloc or "").lower()
    path = p.path or ""
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    scheme = p.scheme or "https"
    return f"{scheme}://{host}{path}"


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


# ── Boilerplate stripping ───────────────────────────────────────────
# Lines that are pure boilerplate wherever they appear. Anchored per-line
# (lines are stripped before matching). Multilingual: EN sources + Yahoo TW
# (zh-TW) + Indonesian syndicated copy.
BOILERPLATE_FULL_LINE: list[re.Pattern] = [
    # English
    re.compile(r"^ADVERTISEMENT$", re.I),
    re.compile(
        r"^(Related(\s+(articles|stories|topics|video|content))?:?|Read more:?|Read also:?|"
        r"MORE ON THIS|Watch:|Watch more|LIVE:|BREAKING:|Sign up (for|to)|Subscribe to|"
        r"Follow (us|BBC|CNN|Al Jazeera)|Download the .{0,40} app|Editor'?s [Nn]ote:?|"
        r"This video can ?not be played)\b.*",
        re.I,
    ),
    re.compile(r"^©.*"),
    re.compile(r"^Copyright .{0,60}$", re.I),
    re.compile(r"^All rights reserved\.?$", re.I),
    # zh-TW (Yahoo TW and syndicated Taiwanese outlets)
    re.compile(r"^廣告$"),
    re.compile(r"^相關新聞.*"),
    re.compile(r"^延伸閱讀.*"),
    re.compile(r"^推薦閱讀.*"),
    re.compile(r"^更多.{0,12}(報導|新聞|內容).*"),
    re.compile(r"^看更多.*"),
    re.compile(r"^原始連結.*"),
    re.compile(r"^記者.{1,15}／.{0,15}報導$"),
    re.compile(r"^〔記者.{0,30}〕$"),
    re.compile(r"^（中央社.{0,30}）$"),
    re.compile(r"^圖／.*"),
    re.compile(r"^（圖／.*）$"),
    # Indonesian
    re.compile(r"^Baca [Jj]uga:?.*"),
    re.compile(r"^Simak (juga|video|breaking).*", re.I),
]

# Patterns that only count as boilerplate on SHORT lines (<90 chars) — photo
# credits and agency sign-offs are short; real sentences mentioning Reuters
# in passing are long and must survive.
BOILERPLATE_SHORT_LINE: list[re.Pattern] = [
    PHOTO_RE,
    re.compile(r"^(Image|Photo|Picture) (source|caption|credit)", re.I),
    re.compile(r"^\(?(Reuters|AP|AFP|Getty Images|EPA|Xinhua|CNA|Antara)\)?\.?$", re.I),
    re.compile(r"^Source:\s", re.I),
]

# Trailing paragraphs that are pure follow/newsletter/contact plugs — trimmed
# only from the END of the article so mid-body sentences are never touched.
_TAIL_PARA = re.compile(
    r"^(Follow .{0,80}|Sign up .{0,100}|Subscribe .{0,100}|For more (news|stories|information).{0,80}|"
    r"Get in touch.{0,80}|Contact us.{0,80}|Listen to .{0,60}podcast.{0,40}|"
    r"Download .{0,40}app.{0,40}|Have you been affected.{0,80})$",
    re.I,
)
_SHORT_LINE_MAX = 90


def strip_boilerplate(text: str, extra: Optional[list[re.Pattern]] = None) -> str:
    """Remove ad markers, related-link blocks, photo credits and promo tails
    from extracted body text. ``extra`` lets a SourceSpec add site-specific
    line patterns (e.g. Yahoo TW promo boxes)."""
    if not text:
        return ""
    full = BOILERPLATE_FULL_LINE + (extra or [])
    kept: list[str] = []
    prev_line: Optional[str] = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line:
            if any(p.search(line) for p in full):
                continue
            if len(line) < _SHORT_LINE_MAX and any(p.search(line) for p in BOILERPLATE_SHORT_LINE):
                continue
            if line == prev_line:          # consecutive duplicate (repeated captions)
                continue
            prev_line = line
        kept.append(raw_line)

    cleaned = "\n".join(kept)
    paras = re.split(r"\n{2,}", cleaned)
    while paras and (not paras[-1].strip() or _TAIL_PARA.match(paras[-1].strip())):
        paras.pop()
    return clean_text("\n\n".join(paras))


def truncate_content(text: str, max_chars: int) -> str:
    """Cap body length at a sentence boundary (incl. CJK 。！？) so stored rows
    stay lean without ending mid-sentence."""
    if not text or len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    pos = max(cut.rfind(ch) for ch in ".!?。！？")
    if pos > max_chars // 2:
        return cut[: pos + 1].rstrip()
    return cut.rstrip()
