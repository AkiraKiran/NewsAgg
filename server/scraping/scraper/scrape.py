import hashlib
import json
import logging
import os
import re
import string
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import langdetect
import nltk
import psycopg2
import psycopg2.extras as extras
import requests
import textstat
import torch
from bs4 import BeautifulSoup
from dotenv import find_dotenv, load_dotenv
from newspaper import Article, Config as NPConfig
from nltk.corpus import stopwords as _sw
from psycopg2 import sql
from transformers import pipeline

load_dotenv(find_dotenv())

SERVER_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(SERVER_ROOT / ".env", override=False)
load_dotenv(SERVER_ROOT / ".hf.env", override=False)

nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)
nltk.download("stopwords", quiet=True)

STOP_WORDS = set(_sw.words("english"))
NOISE_KEYWORDS = {
    "news",
    "breaking",
    "latest",
    "update",
    "watch",
    "video",
    "live",
    "copyright",
    "cookie",
    "privacy",
    "terms",
    "read",
    "story",
    "report",
    "bbc",
    "cnn",
    "aljazeera",
}

logging.basicConfig(level=logging.WARNING)


class Config:
    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    MAX_AGE_DAYS = 60
    TARGET_PER_CATEGORY = 50
    CRAWL_MULT = 3
    MIN_TEXT_LEN = 300
    RATE_DELAY = 1.2
    ZS_THRESHOLD = 0.38

    SENTIMENT_MODEL_MAP = {"Business": "finance"}
    MODEL_NAMES = {
        "sentimentGeneral": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "sentimentFinance": "ProsusAI/finbert",
        "summariser": "facebook/bart-large-cnn",
        "zeroShot": "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
        "ner": "dslim/bert-base-NER",
    }

    NEUTRAL_THRESHOLD = 0.52
    NEUTRAL_POLARITY_CAP = 0.18
    POLARITY_MARGIN = 0.10

    NEON_DSN = os.getenv("NEON_DSN")

    LABELS = {
        "Sport": [
            "sports",
            "football",
            "basketball",
            "tennis",
            "olympics",
            "tournament",
            "league",
        ],
        "Health": [
            "health",
            "medicine",
            "disease",
            "treatment",
            "mental health",
            "healthcare",
        ],
        "Business": [
            "business",
            "economy",
            "finance",
            "market",
            "startup",
            "inflation",
            "banking",
        ],
        "World": [
            "international",
            "conflict",
            "diplomacy",
            "government",
            "war",
            "geopolitics",
        ],
        "Politics": [
            "politics",
            "government",
            "election",
            "policy",
            "law",
            "campaign",
        ],
        "Entertainment": [
            "entertainment",
            "movies",
            "music",
            "celebrity",
            "television",
            "culture",
        ],
        "Science": [
            "science",
            "technology",
            "artificial intelligence",
            "space",
            "research",
            "innovation",
        ],
        "Travel": [
            "travel",
            "tourism",
            "destination",
            "hotel",
            "vacation",
            "airline",
        ],
    }


def _dom(url: str) -> str:
    return urlparse(url).netloc.lower()


def _is_cnn(url: str) -> bool:
    return "cnn.com" in _dom(url)


def _is_bbc(url: str) -> bool:
    return "bbc.com" in _dom(url) or "bbc.co.uk" in _dom(url)


def _is_alj(url: str) -> bool:
    return "aljazeera.com" in _dom(url)


SITE_FAMILIES = [{"cnn.com"}, {"bbc.com", "bbc.co.uk"}, {"aljazeera.com"}]


def same_family(url: str, base: str) -> bool:
    base_domain = _dom(base)
    url_domain = _dom(url)
    for family in SITE_FAMILIES:
        if any(item in base_domain for item in family):
            return any(item in url_domain for item in family)
    return base_domain == url_domain


def make_abs(href: str, base: str) -> str:
    parsed = urlparse(href)
    if parsed.scheme:
        return href.split("?")[0].split("#")[0]
    return urljoin(base, href).split("?")[0].split("#")[0]


def source_meta(url: str) -> dict[str, Any]:
    domain = _dom(url)
    if "cnn.com" in domain:
        return {
            "id": "cnn",
            "name": "CNN",
            "domain": "edition.cnn.com",
            "country": "US",
            "language": "en",
            "logo": "https://edition.cnn.com/media/sites/cnn/favicon.ico",
        }
    if "bbc.com" in domain or "bbc.co.uk" in domain:
        return {
            "id": "bbc",
            "name": "BBC",
            "domain": "bbc.com",
            "country": "GB",
            "language": "en",
            "logo": "https://www.bbc.com/favicon.ico",
        }
    if "aljazeera.com" in domain:
        return {
            "id": "aljazeera",
            "name": "Al Jazeera",
            "domain": "aljazeera.com",
            "country": "QA",
            "language": "en",
            "logo": "https://www.aljazeera.com/favicon.ico",
        }
    return {
        "id": domain,
        "name": domain,
        "domain": domain,
        "country": None,
        "language": "en",
        "logo": None,
    }


_CNN_INC = re.compile(r"/\d{4}/\d{2}/\d{2}/")
_CNN_EXC = re.compile(r"/video/|/gallery/|/live-updates/|/cnn-underscored/|/weather/")
_BBC_INC = re.compile(
    r"/articles/[a-z0-9]|/article/\d{8}"
    r"|/(sport|health|future|travel|business|arts|technology|news|science)/[a-z0-9][a-z0-9-]+-\d{4,}"
)
_BBC_EXC = re.compile(r"/av/|/live/|/iplayer/|/election/results|/sounds/")
_AJ_INC = re.compile(r"/\d{4}/\d{1,2}/\d{1,2}/")
_AJ_EXC = re.compile(r"/video/|/gallery/|/podcast/|/program/|/liveblog/")


def is_article_url(url: str) -> bool:
    if _is_cnn(url):
        return bool(_CNN_INC.search(url)) and not _CNN_EXC.search(url)
    if _is_bbc(url):
        return bool(_BBC_INC.search(url)) and not _BBC_EXC.search(url)
    if _is_alj(url):
        return bool(_AJ_INC.search(url)) and not _AJ_EXC.search(url)
    return bool(re.search(r"/\d{4}/\d{2}/\d{2}/", url))


def date_from_url(url: str) -> Optional[datetime]:
    match = re.search(r"/(\d{4})/(\d{1,2})/(\d{1,2})/", url)
    if not match:
        return None
    try:
        return datetime(
            int(match.group(1)),
            int(match.group(2)),
            int(match.group(3)),
            tzinfo=timezone.utc,
        )
    except Exception:
        return None


def is_fresh(url: str, published: Optional[datetime]) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(days=Config.MAX_AGE_DAYS)
    dt = published or date_from_url(url)
    if dt is None:
        return True
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt >= cutoff


def _normalise_label(raw: str) -> str:
    lowered = str(raw).strip().lower()
    if "pos" in lowered:
        return "positive"
    if "neg" in lowered:
        return "negative"
    if "neu" in lowered:
        return "neutral"
    return {"label_0": "negative", "label_1": "neutral", "label_2": "positive"}.get(
        lowered, "neutral"
    )


def _extract_probs(raw: Any) -> dict[str, float]:
    probs = {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
    rows = raw
    if isinstance(rows, list) and rows and isinstance(rows[0], list):
        rows = rows[0]
    if isinstance(rows, dict):
        rows = [rows]
    for row in rows:
        if not isinstance(row, dict):
            continue
        label = _normalise_label(str(row.get("label", "neutral")))
        try:
            probs[label] = max(0.0, min(1.0, float(row.get("score", 0.0))))
        except Exception:
            pass
    total = sum(probs.values())
    if total > 0:
        probs = {key: value / total for key, value in probs.items()}
    return probs


def _classify_sentiment(probs: dict[str, float]) -> tuple[str, float, float]:
    pos = probs["positive"]
    neu = probs["neutral"]
    neg = probs["negative"]
    polarity = pos - neg
    if neu >= Config.NEUTRAL_THRESHOLD and abs(polarity) <= Config.NEUTRAL_POLARITY_CAP:
        label = "neutral"
    elif polarity >= Config.POLARITY_MARGIN:
        label = "positive"
    elif polarity <= -Config.POLARITY_MARGIN:
        label = "negative"
    else:
        label = max(probs, key=probs.get)
    return label, round(probs[label], 4), round(polarity, 4)


def _normalise_keyword(value: str) -> Optional[str]:
    cleaned = value.strip().lower().lstrip("#")
    if not cleaned:
        return None
    cleaned = re.sub(r"https?://\S+", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9\s-]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if (
        len(cleaned) < 4
        or cleaned in STOP_WORDS
        or cleaned in NOISE_KEYWORDS
        or cleaned.isdigit()
    ):
        return None
    return cleaned


def extract_keywords(
    text: str,
    np_keywords: list[str],
    meta_tags: list[str],
    entities: dict[str, list[str]],
    top_n: int = 30,
) -> list[str]:
    weighted: dict[str, int] = {}

    for kw in np_keywords:
        normalized = _normalise_keyword(kw)
        if normalized:
            weighted[normalized] = weighted.get(normalized, 0) + 3

    for tag in meta_tags:
        normalized = _normalise_keyword(tag)
        if normalized:
            weighted[normalized] = weighted.get(normalized, 0) + 2

    for entity_list in entities.values():
        for ent in entity_list:
            normalized_ent = _normalise_keyword(ent)
            if normalized_ent:
                weighted[normalized_ent] = weighted.get(normalized_ent, 0) + 2
            for token in ent.lower().split():
                normalized_token = _normalise_keyword(token.strip(string.punctuation))
                if normalized_token:
                    weighted[normalized_token] = weighted.get(normalized_token, 0) + 1

    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq = Counter(word for word in words if word not in STOP_WORDS)
    for word, count in freq.most_common(100):
        normalized = _normalise_keyword(word)
        if normalized and normalized not in weighted:
            weighted[normalized] = count

    result: list[str] = []
    for keyword, _ in sorted(weighted.items(), key=lambda item: -item[1]):
        if keyword not in result:
            result.append(keyword)
        if len(result) >= top_n:
            break
    return result


def reading_metrics(text: str) -> dict[str, Any]:
    word_count = len(text.split())
    return {
        "word_count": word_count,
        "reading_time_min": max(1, round(word_count / 200)),
        "flesch_score": round(textstat.flesch_reading_ease(text), 2),
        "flesch_kincaid": round(textstat.flesch_kincaid_grade(text), 2),
        "smog_index": round(textstat.smog_index(text), 2),
    }


def detect_language(text: str) -> str:
    try:
        return langdetect.detect(text[:1000])
    except Exception:
        return "en"


def url_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


class MetadataExtractor:
    @staticmethod
    def extract_jsonld(soup: BeautifulSoup) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for script in soup.find_all("script", {"type": "application/ld+json"}):
            try:
                data = json.loads(script.string or "")
                if isinstance(data, list):
                    items.extend(item for item in data if isinstance(item, dict))
                elif isinstance(data, dict):
                    items.append(data)
            except Exception:
                continue
        return items

    @staticmethod
    def jsonld_article(items: list[dict[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for item in items:
            raw_type = item.get("@type", "")
            type_text = " ".join(raw_type) if isinstance(raw_type, list) else str(raw_type)
            if not any(name in type_text for name in ("Article", "NewsArticle", "BlogPosting")):
                continue
            result["jsonld_headline"] = item.get("headline")
            result["jsonld_description"] = item.get("description")
            result["jsonld_datePublished"] = item.get("datePublished")
            result["jsonld_dateModified"] = item.get("dateModified")
            result["jsonld_isAccessibleForFree"] = item.get("isAccessibleForFree")
            result["jsonld_isPremium"] = item.get("isPremium")
            result["jsonld_genre"] = item.get("genre")
            result["jsonld_wordCount"] = item.get("wordCount")

            author = item.get("author")
            if isinstance(author, dict):
                result["jsonld_author_name"] = author.get("name")
                result["jsonld_author_url"] = author.get("url") or author.get("sameAs")
            elif isinstance(author, list) and author:
                names = [a.get("name", "") for a in author if isinstance(a, dict)]
                result["jsonld_author_name"] = ", ".join(name for name in names if name)

            image = item.get("image")
            if isinstance(image, dict):
                result["jsonld_image"] = image.get("url")
            elif isinstance(image, str):
                result["jsonld_image"] = image
            break
        return result

    @staticmethod
    def extract_og(soup: BeautifulSoup, url: str) -> dict[str, Any]:
        def get_meta(property_name: str, is_twitter: bool = False) -> Optional[str]:
            key = "name" if is_twitter else "property"
            value = f"twitter:{property_name}" if is_twitter else f"og:{property_name}"
            tag = soup.find("meta", {key: value}) or soup.find("meta", {"name": value})
            if tag and tag.get("content"):
                return str(tag["content"]).strip()
            return None

        canonical = None
        canonical_tag = soup.find("link", {"rel": "canonical"})
        if canonical_tag and canonical_tag.get("href"):
            canonical = str(canonical_tag["href"]).strip()

        published_meta = None
        for attr_name, attr_value in [
            ("property", "article:published_time"),
            ("name", "pubdate"),
            ("itemprop", "datePublished"),
            ("name", "date"),
        ]:
            tag = soup.find("meta", {attr_name: attr_value})
            if tag and tag.get("content"):
                published_meta = str(tag["content"]).strip()
                break

        modified_meta = None
        for attr_name, attr_value in [
            ("property", "article:modified_time"),
            ("itemprop", "dateModified"),
        ]:
            tag = soup.find("meta", {attr_name: attr_value})
            if tag and tag.get("content"):
                modified_meta = str(tag["content"]).strip()
                break

        meta_tags: list[str] = []
        keyword_meta = soup.find("meta", {"name": re.compile(r"keywords|news_keywords", re.I)})
        if keyword_meta and keyword_meta.get("content"):
            meta_tags = [
                token.strip() for token in str(keyword_meta["content"]).split(",") if token.strip()
            ]

        section = None
        for attr_name, attr_value in [("property", "article:section"), ("name", "section")]:
            tag = soup.find("meta", {attr_name: attr_value})
            if tag and tag.get("content"):
                section = str(tag["content"]).strip()
                break

        images: list[dict[str, Any]] = []
        main_image = get_meta("image")
        if main_image:
            images.append(
                {"url": main_image, "alt": None, "caption": None, "is_primary": True}
            )

        for figure in soup.find_all("figure"):
            image = figure.find("img")
            if not image or not image.get("src"):
                continue
            image_url = make_abs(str(image["src"]), url)
            if image_url == main_image:
                continue
            caption = None
            caption_tag = figure.find("figcaption")
            if caption_tag:
                caption = caption_tag.get_text(strip=True)[:300]
            images.append(
                {
                    "url": image_url,
                    "alt": image.get("alt", "").strip() or None,
                    "caption": caption,
                    "is_primary": False,
                }
            )

        return {
            "og_title": get_meta("title"),
            "og_description": get_meta("description"),
            "og_type": get_meta("type"),
            "og_site_name": get_meta("site_name"),
            "og_locale": get_meta("locale"),
            "twitter_card": get_meta("card", is_twitter=True),
            "twitter_site": get_meta("site", is_twitter=True),
            "canonical_url": canonical,
            "published_meta": published_meta,
            "modified_meta": modified_meta,
            "meta_tags": meta_tags,
            "section": section,
            "images": images,
        }

    @staticmethod
    def extract_video(
        soup: BeautifulSoup, url: str, jsonld_items: list[dict[str, Any]]
    ) -> Optional[str]:
        for item in jsonld_items:
            item_type = str(item.get("@type", ""))
            if "VideoObject" in item_type or "MediaObject" in item_type:
                video = item.get("contentUrl") or item.get("embedUrl")
                if isinstance(video, str) and video.strip():
                    return video.strip()

        og_video = soup.find("meta", {"property": "og:video"})
        if og_video and og_video.get("content"):
            return str(og_video["content"]).strip()

        twitter_player = soup.find("meta", {"name": "twitter:player"})
        if twitter_player and twitter_player.get("content"):
            return str(twitter_player["content"]).strip()

        iframe = soup.find(
            "iframe",
            {"src": re.compile(r"av-embeds|player\.bbc\.com|cnn\.com/video|youtube|vimeo", re.I)},
        )
        if iframe and iframe.get("src"):
            return make_abs(str(iframe["src"]).strip(), url)

        if _is_cnn(url):
            node = soup.find(attrs={"data-video-slug": True})
            if node:
                slug = str(node.get("data-video-slug", "")).strip()
                if slug:
                    return f"https://edition.cnn.com/videos/{slug}"
        return None

    @staticmethod
    def extract_related(soup: BeautifulSoup, url: str) -> list[str]:
        related: list[str] = []
        seen: set[str] = set()
        containers = soup.find_all("article") or [soup]
        for container in containers:
            for link in container.find_all("a", href=True):
                href = make_abs(str(link["href"]), url)
                if (
                    href not in seen
                    and same_family(href, url)
                    and is_article_url(href)
                    and href != url
                ):
                    related.append(href)
                    seen.add(href)
                    if len(related) >= 10:
                        break
            if len(related) >= 10:
                break
        return related

    @staticmethod
    def extract_author(
        soup: BeautifulSoup, url: str, np_authors: list[str], jsonld: dict[str, Any]
    ) -> dict[str, Optional[str]]:
        name = jsonld.get("jsonld_author_name") or (
            ", ".join(np_authors) if np_authors else "Unknown"
        )
        author_url = jsonld.get("jsonld_author_url")

        try:
            if _is_bbc(url):
                tag = soup.find(attrs={"data-testid": "byline-name"})
                if tag:
                    link = tag if tag.name == "a" else tag.find("a", href=True)
                    if link and link.get("href"):
                        author_url = author_url or make_abs(str(link["href"]), url)
                        if not np_authors:
                            name = link.get_text(strip=True)
            elif _is_cnn(url):
                byline = soup.find(attrs={"class": re.compile(r"byline", re.I)})
                if byline:
                    link = byline if byline.name == "a" else byline.find("a", href=True)
                    if link and link.get("href"):
                        author_url = author_url or make_abs(str(link["href"]), url)
                        if not np_authors:
                            name = link.get_text(strip=True)
            elif _is_alj(url):
                byline = soup.find("div", {"class": re.compile(r"author", re.I)})
                if byline:
                    link = byline.find("a", href=True)
                    if link and link.get("href"):
                        author_url = author_url or make_abs(str(link["href"]), url)
                        if not np_authors:
                            name = link.get_text(strip=True)
        except Exception:
            pass

        return {"name": name or "Unknown", "url": author_url}


class AIProcessor:
    def __init__(self, hf_token: Optional[str] = None):
        self.device = 0 if torch.cuda.is_available() else -1
        print(f"⚙️ Loading AI models on {'GPU' if self.device == 0 else 'CPU'}...")

        self.sent_general = pipeline(
            "sentiment-analysis",
            model=Config.MODEL_NAMES["sentimentGeneral"],
            truncation=True,
            max_length=512,
            top_k=None,
            device=self.device,
        )
        self.sent_finance = pipeline(
            "sentiment-analysis",
            model=Config.MODEL_NAMES["sentimentFinance"],
            truncation=True,
            max_length=512,
            top_k=None,
            device=self.device,
        )
        classifier_kwargs: dict[str, Any] = {
            "model": Config.MODEL_NAMES["zeroShot"],
            "device": self.device,
        }
        if hf_token:
            classifier_kwargs["token"] = hf_token
        self.classifier = pipeline("zero-shot-classification", **classifier_kwargs)
        self.ner = pipeline(
            "ner",
            model=Config.MODEL_NAMES["ner"],
            aggregation_strategy="simple",
            device=self.device,
        )

        self.summarizer = None
        try:
            self.summarizer = pipeline(
                "summarization",
                model=Config.MODEL_NAMES["summariser"],
                truncation=True,
                device=self.device,
            )
        except Exception:
            self.summarizer = None

        self.model_catalog = dict(Config.MODEL_NAMES)
        print("✅ Models loaded.")

    def summarize(self, text: str) -> Optional[str]:
        chunk = text[:1024].strip()
        if len(chunk.split()) <= 50:
            return None
        if self.summarizer:
            try:
                result = self.summarizer(
                    chunk, max_length=80, min_length=30, do_sample=False
                )
                summary = result[0].get("summary_text")
                if isinstance(summary, str) and summary.strip():
                    return summary.strip()
            except Exception:
                pass
        sentences = re.split(r"(?<=[.!?])\s+", chunk)
        fallback = " ".join(sentences[:3]).strip()
        if len(fallback) > 420:
            fallback = fallback[:420].rsplit(" ", 1)[0] + "..."
        return fallback or None

    def classify_batch(
        self, titles: list[str], labels: list[str]
    ) -> list[dict[str, Any]]:
        out = self.classifier(titles, candidate_labels=labels, multi_label=True)
        if isinstance(out, dict):
            return [out]
        return out

    def extract_entities(self, text: str) -> dict[str, list[str]]:
        raw = self.ner(text[:1500])
        entities: dict[str, list[str]] = {
            "persons": [],
            "organizations": [],
            "locations": [],
            "misc": [],
        }
        entity_map = {
            "PER": "persons",
            "PERSON": "persons",
            "ORG": "organizations",
            "LOC": "locations",
            "MISC": "misc",
        }
        for entity in raw:
            entity_group = str(entity.get("entity_group", "")).upper()
            key = entity_map.get(entity_group)
            word = str(entity.get("word", "")).strip()
            if key and word and word not in entities[key]:
                entities[key].append(word)
        return entities

    def score_sentiment(self, text: str, topic: str) -> dict[str, Any]:
        model_key = Config.SENTIMENT_MODEL_MAP.get(topic, "general")
        model = self.sent_finance if model_key == "finance" else self.sent_general
        probs = _extract_probs(model(text[:1500]))
        sentiment_type, score, comparative = _classify_sentiment(probs)
        return {
            "type": sentiment_type,
            "score": score,
            "comparative": comparative,
            "probabilities": {
                "positive": round(probs["positive"], 4),
                "neutral": round(probs["neutral"], 4),
                "negative": round(probs["negative"], 4),
            },
            "model": model_key,
        }


class DatabaseManager:
    @staticmethod
    def _source_table_name(publisher_name: str) -> str:
        suffix = re.sub(r"[^a-z0-9_]+", "_", publisher_name.lower()).strip("_") or "unknown"
        return f"articles_{suffix}"

    @staticmethod
    def _ensure_table(conn: psycopg2.extensions.connection, table_name: str) -> None:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL(
                    """
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        id                  TEXT PRIMARY KEY,
                        url                 TEXT UNIQUE NOT NULL,
                        canonical_url       TEXT,
                        source_id           TEXT,
                        source_name         TEXT,
                        source_domain       TEXT,
                        source_country      TEXT,
                        source_language     TEXT,
                        source_logo         TEXT,
                        author_name         TEXT,
                        author_url          TEXT,
                        title               TEXT NOT NULL,
                        description         TEXT,
                        content             TEXT,
                        ai_summary          TEXT,
                        url_to_image        TEXT,
                        images              JSONB DEFAULT '[]'::jsonb,
                        video_url           TEXT,
                        topic               TEXT,
                        section             TEXT,
                        meta_tags           JSONB DEFAULT '[]'::jsonb,
                        og_type             TEXT,
                        language            TEXT,
                        published_at        TIMESTAMPTZ,
                        modified_at         TIMESTAMPTZ,
                        scraped_at          TIMESTAMPTZ,
                        sentiment_type      TEXT,
                        sentiment_score     NUMERIC(6,4),
                        sentiment_polarity  NUMERIC(6,4),
                        sentiment_pos       NUMERIC(6,4),
                        sentiment_neu       NUMERIC(6,4),
                        sentiment_neg       NUMERIC(6,4),
                        sentiment_model     TEXT,
                        toxicity_label      TEXT,
                        toxicity_score      NUMERIC(6,4),
                        keywords            JSONB DEFAULT '[]'::jsonb,
                        entities            JSONB DEFAULT '{}'::jsonb,
                        readability         JSONB DEFAULT '{}'::jsonb,
                        related_urls        JSONB DEFAULT '[]'::jsonb,
                        ai_relevance        NUMERIC(6,4),
                        ai_top_label        TEXT,
                        ai_label_scores     JSONB DEFAULT '{}'::jsonb,
                        is_premium          BOOLEAN,
                        is_accessible_free  BOOLEAN,
                        jsonld_word_count   INTEGER,
                        og_data             JSONB DEFAULT '{}'::jsonb
                    )
                    """
                ).format(table_name=sql.Identifier(table_name))
            )

            cur.execute(
                sql.SQL(
                    "CREATE INDEX IF NOT EXISTS {idx_topic} ON {table_name}(topic)"
                ).format(
                    idx_topic=sql.Identifier(f"idx_{table_name}_topic"),
                    table_name=sql.Identifier(table_name),
                )
            )
            cur.execute(
                sql.SQL(
                    "CREATE INDEX IF NOT EXISTS {idx_published} ON {table_name}(published_at DESC)"
                ).format(
                    idx_published=sql.Identifier(f"idx_{table_name}_published"),
                    table_name=sql.Identifier(table_name),
                )
            )

    @staticmethod
    def _upsert(
        cur: psycopg2.extensions.cursor, table_name: str, record: dict[str, Any]
    ) -> None:
        source = record.get("source", {})
        sentiment = record.get("sentiment", {})
        readability = record.get("readability", {})
        og_data = record.get("og", {})

        cur.execute(
            sql.SQL(
                """
                INSERT INTO {table_name} (
                    id, url, canonical_url,
                    source_id, source_name, source_domain, source_country, source_language, source_logo,
                    author_name, author_url,
                    title, description, content, ai_summary,
                    url_to_image, images, video_url,
                    topic, section, meta_tags, og_type, language,
                    published_at, modified_at, scraped_at,
                    sentiment_type, sentiment_score, sentiment_polarity, sentiment_pos, sentiment_neu, sentiment_neg, sentiment_model,
                    toxicity_label, toxicity_score,
                    keywords, entities, readability, related_urls,
                    ai_relevance, ai_top_label, ai_label_scores,
                    is_premium, is_accessible_free, jsonld_word_count, og_data
                )
                VALUES (
                    %(id)s, %(url)s, %(canonical_url)s,
                    %(source_id)s, %(source_name)s, %(source_domain)s, %(source_country)s, %(source_language)s, %(source_logo)s,
                    %(author_name)s, %(author_url)s,
                    %(title)s, %(description)s, %(content)s, %(ai_summary)s,
                    %(url_to_image)s, %(images)s, %(video_url)s,
                    %(topic)s, %(section)s, %(meta_tags)s, %(og_type)s, %(language)s,
                    %(published_at)s, %(modified_at)s, %(scraped_at)s,
                    %(sentiment_type)s, %(sentiment_score)s, %(sentiment_polarity)s, %(sentiment_pos)s, %(sentiment_neu)s, %(sentiment_neg)s, %(sentiment_model)s,
                    %(toxicity_label)s, %(toxicity_score)s,
                    %(keywords)s, %(entities)s, %(readability)s, %(related_urls)s,
                    %(ai_relevance)s, %(ai_top_label)s, %(ai_label_scores)s,
                    %(is_premium)s, %(is_accessible_free)s, %(jsonld_word_count)s, %(og_data)s
                )
                ON CONFLICT (url) DO UPDATE SET
                    title               = EXCLUDED.title,
                    description         = EXCLUDED.description,
                    content             = EXCLUDED.content,
                    ai_summary          = EXCLUDED.ai_summary,
                    url_to_image        = EXCLUDED.url_to_image,
                    images              = EXCLUDED.images,
                    video_url           = EXCLUDED.video_url,
                    topic               = EXCLUDED.topic,
                    section             = EXCLUDED.section,
                    meta_tags           = EXCLUDED.meta_tags,
                    og_type             = EXCLUDED.og_type,
                    language            = EXCLUDED.language,
                    published_at        = EXCLUDED.published_at,
                    modified_at         = EXCLUDED.modified_at,
                    scraped_at          = EXCLUDED.scraped_at,
                    sentiment_type      = EXCLUDED.sentiment_type,
                    sentiment_score     = EXCLUDED.sentiment_score,
                    sentiment_polarity  = EXCLUDED.sentiment_polarity,
                    sentiment_pos       = EXCLUDED.sentiment_pos,
                    sentiment_neu       = EXCLUDED.sentiment_neu,
                    sentiment_neg       = EXCLUDED.sentiment_neg,
                    sentiment_model     = EXCLUDED.sentiment_model,
                    toxicity_label      = EXCLUDED.toxicity_label,
                    toxicity_score      = EXCLUDED.toxicity_score,
                    keywords            = EXCLUDED.keywords,
                    entities            = EXCLUDED.entities,
                    readability         = EXCLUDED.readability,
                    related_urls        = EXCLUDED.related_urls,
                    ai_relevance        = EXCLUDED.ai_relevance,
                    ai_top_label        = EXCLUDED.ai_top_label,
                    ai_label_scores     = EXCLUDED.ai_label_scores,
                    is_premium          = EXCLUDED.is_premium,
                    is_accessible_free  = EXCLUDED.is_accessible_free,
                    jsonld_word_count   = EXCLUDED.jsonld_word_count,
                    og_data             = EXCLUDED.og_data,
                    source_id           = EXCLUDED.source_id,
                    source_name         = EXCLUDED.source_name,
                    source_domain       = EXCLUDED.source_domain,
                    source_country      = EXCLUDED.source_country,
                    source_language     = EXCLUDED.source_language,
                    source_logo         = EXCLUDED.source_logo,
                    author_name         = EXCLUDED.author_name,
                    author_url          = EXCLUDED.author_url
                """
            ).format(table_name=sql.Identifier(table_name)),
            {
                "id": record["id"],
                "url": record["url"],
                "canonical_url": record.get("canonical_url"),
                "source_id": source.get("id"),
                "source_name": source.get("name"),
                "source_domain": source.get("domain"),
                "source_country": source.get("country"),
                "source_language": source.get("language"),
                "source_logo": source.get("logo"),
                "author_name": record.get("author"),
                "author_url": record.get("author_url"),
                "title": record.get("title"),
                "description": record.get("description"),
                "content": record.get("content"),
                "ai_summary": record.get("ai_summary"),
                "url_to_image": record.get("url_to_image"),
                "images": extras.Json(record.get("images", [])),
                "video_url": record.get("video_url"),
                "topic": record.get("topic"),
                "section": record.get("section"),
                "meta_tags": extras.Json(record.get("meta_tags", [])),
                "og_type": record.get("og_type"),
                "language": record.get("language"),
                "published_at": record.get("published_at"),
                "modified_at": record.get("modified_at"),
                "scraped_at": record.get("scraped_at"),
                "sentiment_type": sentiment.get("type"),
                "sentiment_score": sentiment.get("score"),
                "sentiment_polarity": sentiment.get("comparative"),
                "sentiment_pos": sentiment.get("probabilities", {}).get("positive"),
                "sentiment_neu": sentiment.get("probabilities", {}).get("neutral"),
                "sentiment_neg": sentiment.get("probabilities", {}).get("negative"),
                "sentiment_model": sentiment.get("model"),
                "toxicity_label": record.get("toxicity", {}).get("label"),
                "toxicity_score": record.get("toxicity", {}).get("score"),
                "keywords": extras.Json(record.get("keywords", [])),
                "entities": extras.Json(record.get("entities", {})),
                "readability": extras.Json(readability),
                "related_urls": extras.Json(record.get("related_urls", [])),
                "ai_relevance": record.get("ai_relevance"),
                "ai_top_label": record.get("ai_top_label"),
                "ai_label_scores": extras.Json(record.get("ai_label_scores", {})),
                "is_premium": record.get("is_premium"),
                "is_accessible_free": record.get("is_accessible_free"),
                "jsonld_word_count": record.get("jsonld_word_count"),
                "og_data": extras.Json(og_data),
            },
        )

    @staticmethod
    def upsert_all(dsn: Optional[str], publisher_name: str, articles: list[dict[str, Any]]) -> None:
        if not articles:
            return
        if not dsn:
            print("🐘 PostgreSQL skipped: NEON_DSN is not set.")
            return

        source_table = DatabaseManager._source_table_name(publisher_name)
        target_tables = ["articles", source_table]
        conn: Optional[psycopg2.extensions.connection] = None
        try:
            conn = psycopg2.connect(dsn)
            for table_name in target_tables:
                DatabaseManager._ensure_table(conn, table_name)

            ok = 0
            with conn.cursor() as cur:
                for record in articles:
                    for table_name in target_tables:
                        DatabaseManager._upsert(cur, table_name, record)
                    ok += 1
            conn.commit()
            print(
                f"🐘 PostgreSQL updated {ok}/{len(articles)} rows "
                f"(shared table + {source_table})."
            )
        except Exception as exc:
            if conn:
                conn.rollback()
            print(f"🐘 DB Error: {exc}")
        finally:
            if conn:
                conn.close()


class NewsOrchestrator:
    def __init__(
        self,
        sources_config: dict[str, list[str]],
        publisher_name: str,
        hf_token: Optional[str],
    ):
        self.sources = sources_config
        self.publisher_name = publisher_name
        self.ai = AIProcessor(hf_token)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": Config.USER_AGENT})
        self.rate_limit: dict[str, float] = {}
        self.np_cfg = NPConfig()
        self.np_cfg.browser_user_agent = Config.USER_AGENT
        self.np_cfg.request_timeout = 15

    def _get(self, url: str, timeout: int = 15) -> Optional[requests.Response]:
        domain = _dom(url)
        wait = self.rate_limit.get(domain, 0) - time.time()
        if wait > 0:
            time.sleep(wait)
        try:
            response = self.session.get(url, timeout=timeout)
            self.rate_limit[domain] = time.time() + Config.RATE_DELAY
            response.raise_for_status()
            return response
        except Exception:
            return None

    def crawl_source(self, source_url: str, topic: str, max_candidates: int) -> list[dict[str, Any]]:
        response = self._get(source_url)
        if not response:
            return []
        soup = BeautifulSoup(response.text, "html.parser")
        seen: set[str] = set()
        results: list[dict[str, Any]] = []
        for link in soup.find_all("a", href=True):
            url = make_abs(str(link["href"]), source_url)
            if (
                not same_family(url, source_url)
                or not is_article_url(url)
                or url in seen
            ):
                continue

            title_hint = link.get("aria-label", "").strip()
            if not title_hint:
                title_hint = link.get_text(strip=True)
            if len(title_hint) < 15:
                continue

            seen.add(url)
            results.append({"url": url, "topic": topic, "title_hint": title_hint})
            if len(results) >= max_candidates:
                break
        return results

    def ai_filter(self, candidates: list[dict[str, Any]], topic: str) -> list[dict[str, Any]]:
        if not candidates:
            return []
        labels = Config.LABELS.get(topic, ["news"])
        titles = [candidate["title_hint"] for candidate in candidates]
        try:
            classifier_result = self.ai.classify_batch(titles, labels)
        except Exception:
            return candidates

        filtered: list[dict[str, Any]] = []
        for candidate, result in zip(candidates, classifier_result):
            top_scores = result.get("scores", [])
            if not top_scores:
                continue
            score = float(top_scores[0])
            if score < Config.ZS_THRESHOLD:
                continue
            labels_out = [str(label) for label in result.get("labels", [])[:5]]
            scores_out = [round(float(item), 4) for item in top_scores[:5]]
            candidate["ai_relevance_score"] = round(score, 4)
            candidate["ai_top_label"] = labels_out[0] if labels_out else None
            candidate["ai_label_scores"] = dict(zip(labels_out, scores_out))
            filtered.append(candidate)
        return filtered

    def enrich_article(self, item: dict[str, Any]) -> Optional[dict[str, Any]]:
        url = item["url"]
        topic = item["topic"]
        ai_score = float(item.get("ai_relevance_score", 1.0))
        try:
            article = Article(url, config=self.np_cfg)
            article.download()
            article.parse()
            article.nlp()
        except Exception:
            return None

        text = article.text.strip()
        if len(text) < Config.MIN_TEXT_LEN:
            return None
        if not is_fresh(url, article.publish_date):
            return None

        response = self._get(url, timeout=12)
        soup = BeautifulSoup(response.text if response else "", "html.parser")

        jsonld_items = MetadataExtractor.extract_jsonld(soup)
        jsonld = MetadataExtractor.jsonld_article(jsonld_items)
        og_data = MetadataExtractor.extract_og(soup, url)
        video_url = MetadataExtractor.extract_video(soup, url, jsonld_items)
        related_urls = MetadataExtractor.extract_related(soup, url)
        author_info = MetadataExtractor.extract_author(soup, url, article.authors, jsonld)

        entities = self.ai.extract_entities(text)
        sentiment = self.ai.score_sentiment(text, topic)
        ai_summary = self.ai.summarize(text)
        readability = reading_metrics(text)
        language = detect_language(text)

        keywords = extract_keywords(
            text=text,
            np_keywords=article.keywords or [],
            meta_tags=og_data.get("meta_tags", []),
            entities=entities,
            top_n=30,
        )

        primary_image = (
            article.top_image
            or jsonld.get("jsonld_image")
            or next(
                (
                    image.get("url")
                    for image in og_data.get("images", [])
                    if isinstance(image, dict) and image.get("url")
                ),
                None,
            )
        )

        images = og_data.get("images", [])
        if primary_image and not any(
            isinstance(image, dict) and image.get("url") == primary_image for image in images
        ):
            images = [{"url": primary_image, "alt": None, "caption": None, "is_primary": True}] + images

        description = (
            og_data.get("og_description")
            or jsonld.get("jsonld_description")
            or article.summary.strip()
            or f"{text[:300]}..."
        )

        published_at = None
        if article.publish_date:
            date_value = article.publish_date
            if date_value.tzinfo is None:
                date_value = date_value.replace(tzinfo=timezone.utc)
            published_at = date_value.isoformat()
        published_at = (
            published_at
            or og_data.get("published_meta")
            or jsonld.get("jsonld_datePublished")
            or datetime.now(timezone.utc).isoformat()
        )
        modified_at = og_data.get("modified_meta") or jsonld.get("jsonld_dateModified")
        canonical_url = og_data.get("canonical_url") or url

        return {
            "id": url_id(canonical_url),
            "url": url,
            "canonical_url": canonical_url,
            "source": source_meta(url),
            "author": author_info.get("name") or "Unknown",
            "author_url": author_info.get("url"),
            "title": article.title or og_data.get("og_title") or jsonld.get("jsonld_headline") or "Untitled",
            "description": description,
            "content": text,
            "ai_summary": ai_summary,
            "url_to_image": primary_image,
            "images": images,
            "video_url": video_url,
            "published_at": published_at,
            "modified_at": modified_at,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "topic": topic,
            "section": og_data.get("section") or jsonld.get("jsonld_genre"),
            "meta_tags": og_data.get("meta_tags", []),
            "og_type": og_data.get("og_type"),
            "language": language,
            "sentiment": sentiment,
            "toxicity": {"label": "non-toxic", "score": 0.0},
            "keywords": keywords,
            "entities": entities,
            "readability": readability,
            "related_urls": related_urls,
            "ai_relevance": round(ai_score, 4),
            "ai_top_label": item.get("ai_top_label"),
            "ai_label_scores": item.get("ai_label_scores", {}),
            "is_premium": jsonld.get("jsonld_isPremium"),
            "is_accessible_free": jsonld.get("jsonld_isAccessibleForFree"),
            "jsonld_word_count": jsonld.get("jsonld_wordCount"),
            "og": {
                "title": og_data.get("og_title"),
                "description": og_data.get("og_description"),
                "site_name": og_data.get("og_site_name"),
                "locale": og_data.get("og_locale"),
                "twitter_card": og_data.get("twitter_card"),
                "twitter_site": og_data.get("twitter_site"),
            },
        }

    def run(self) -> dict[str, Any]:
        final_articles: list[dict[str, Any]] = []
        global_seen: set[str] = set()

        for topic, urls in self.sources.items():
            print(f"\n{'=' * 50}\n🔍 SCRAPING {self.publisher_name}: {topic.upper()}\n{'=' * 50}")

            per_source_target = max(
                20, (Config.TARGET_PER_CATEGORY * Config.CRAWL_MULT) // max(1, len(urls))
            )
            candidate_pool: list[dict[str, Any]] = []
            for source_url in urls:
                candidate_pool.extend(self.crawl_source(source_url, topic, per_source_target))

            deduped_candidates = list({item["url"]: item for item in candidate_pool}.values())
            validated = self.ai_filter(deduped_candidates, topic)
            validated.sort(
                key=lambda item: (
                    -float(item.get("ai_relevance_score", 0)),
                    -(date_from_url(item["url"]).timestamp() if date_from_url(item["url"]) else 0.0),
                )
            )

            collected = 0
            for item in validated:
                if collected >= Config.TARGET_PER_CATEGORY:
                    break
                if item["url"] in global_seen:
                    continue
                record = self.enrich_article(item)
                if not record:
                    continue
                canonical = record["canonical_url"]
                if canonical in global_seen:
                    continue
                global_seen.add(canonical)
                final_articles.append(record)
                collected += 1
                has_video = "🎬 " if record.get("video_url") else ""
                print(
                    f"✅ {record['sentiment']['type'].upper()} | {has_video}{record['title'][:60]}"
                )

            print(f"📦 {topic}: {collected} articles collected")

        payload = {
            "status": "ok",
            "totalResults": len(final_articles),
            "articles": final_articles,
            "scrapedAt": datetime.now(timezone.utc).isoformat(),
            "categories": list(self.sources.keys()),
            "aiModels": self.ai.model_catalog,
        }

        output_path = (
            os.path.join(os.path.dirname(__file__), f"news_data_{self.publisher_name.lower()}.json")
        )
        with open(output_path, "w", encoding="utf-8") as out_file:
            json.dump(payload, out_file, indent=2, ensure_ascii=False, default=str)

        print(f"\n🎉 Processed {len(final_articles)} items for {self.publisher_name}! Saved to {output_path}.")
        print(f"📹 With video: {sum(1 for item in final_articles if item.get('video_url'))}")
        print(
            f"🖼️ With image: {sum(1 for item in final_articles if item.get('url_to_image'))}"
        )
        print(
            f"🤖 With AI summary: {sum(1 for item in final_articles if item.get('ai_summary'))}"
        )

        DatabaseManager.upsert_all(Config.NEON_DSN, self.publisher_name, final_articles)
        return payload

