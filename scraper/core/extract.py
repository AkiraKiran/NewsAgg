"""HTML metadata extraction: OpenGraph, JSON-LD, video, related, author.

Faithful port of the extraction helpers from scraper4/5. Pure parsing over a
BeautifulSoup tree — no network, no ML.
"""
from __future__ import annotations

import json
import re
from typing import Optional

from bs4 import BeautifulSoup

from core.cleaner import is_alj, is_bbc, is_cnn, is_article_url, make_abs, same_family


def extract_og(soup: BeautifulSoup, url: str) -> dict:
    def og(prop):
        tag = soup.find("meta", {"property": f"og:{prop}"}) or soup.find("meta", {"name": f"og:{prop}"})
        return tag["content"].strip() if tag and tag.get("content") else None

    def tw(name):
        tag = soup.find("meta", {"name": f"twitter:{name}"})
        return tag["content"].strip() if tag and tag.get("content") else None

    canon = None
    ctag = soup.find("link", {"rel": "canonical"})
    if ctag and ctag.get("href"):
        canon = ctag["href"].strip()

    pub = None
    for attr in [("property", "article:published_time"), ("name", "pubdate"), ("itemprop", "datePublished"), ("name", "date")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"):
            pub = tag["content"].strip()
            break

    mod = None
    for attr in [("property", "article:modified_time"), ("itemprop", "dateModified")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"):
            mod = tag["content"].strip()
            break

    tags = []
    kw_tag = soup.find("meta", {"name": re.compile(r"keywords|news_keywords", re.I)})
    if kw_tag and kw_tag.get("content"):
        tags = [t.strip() for t in kw_tag["content"].split(",") if t.strip()]

    section = None
    for attr in [("property", "article:section"), ("name", "section")]:
        tag = soup.find("meta", {attr[0]: attr[1]})
        if tag and tag.get("content"):
            section = tag["content"].strip()
            break

    images = []
    main_img = og("image")
    if main_img:
        caption = None
        try:
            fig = soup.find("figure")
            if fig:
                cap = fig.find("figcaption")
                if cap:
                    caption = cap.get_text(strip=True)[:300]
        except Exception:
            pass
        images.append({"url": main_img, "caption": caption, "is_primary": True})

    for fig in soup.find_all("figure"):
        img = fig.find("img")
        cap = fig.find("figcaption")
        if img and img.get("src"):
            src = make_abs(img["src"], url)
            if src != main_img:
                images.append({
                    "url": src,
                    "alt": img.get("alt", "").strip(),
                    "caption": cap.get_text(strip=True)[:300] if cap else None,
                    "is_primary": False,
                })

    return {
        "og_title": og("title"),
        "og_description": og("description"),
        "og_type": og("type"),
        "og_site_name": og("site_name"),
        "og_locale": og("locale"),
        "twitter_card": tw("card"),
        "twitter_site": tw("site"),
        "canonical_url": canon,
        "published_meta": pub,
        "modified_meta": mod,
        "meta_tags": tags,
        "section": section,
        "images": images,
    }


def extract_jsonld(soup: BeautifulSoup) -> list[dict]:
    items: list[dict] = []
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
    result: dict = {}
    for item in items:
        t = item.get("@type", "")
        if not isinstance(t, str):
            t = " ".join(t) if isinstance(t, list) else str(t)
        if not any(x in t for x in ("Article", "NewsArticle", "BlogPosting", "ReportageNewsArticle")):
            continue
        result["jsonld_headline"] = item.get("headline")
        result["jsonld_description"] = item.get("description")
        result["jsonld_datePublished"] = item.get("datePublished")
        result["jsonld_dateModified"] = item.get("dateModified")
        result["jsonld_isAccessibleForFree"] = item.get("isAccessibleForFree")
        result["jsonld_isPremium"] = item.get("isPremium")
        result["jsonld_genre"] = item.get("genre")
        result["jsonld_wordCount"] = item.get("wordCount")
        auth = item.get("author")
        if isinstance(auth, dict):
            result["jsonld_author_name"] = auth.get("name")
            result["jsonld_author_url"] = auth.get("url") or auth.get("sameAs")
        elif isinstance(auth, list) and auth:
            result["jsonld_author_name"] = ", ".join(a.get("name", "") for a in auth if isinstance(a, dict))
        pub = item.get("publisher")
        if isinstance(pub, dict):
            result["jsonld_publisher"] = pub.get("name")
        img = item.get("image")
        if isinstance(img, dict):
            result["jsonld_image"] = img.get("url")
        elif isinstance(img, str):
            result["jsonld_image"] = img
        break
    return result


def extract_video(soup: BeautifulSoup, url: str, jsonld_items: list[dict]) -> Optional[str]:
    for item in jsonld_items:
        t = item.get("@type", "")
        if "VideoObject" in str(t) or "MediaObject" in str(t):
            v = item.get("contentUrl") or item.get("embedUrl")
            if v:
                return v
    og_v = soup.find("meta", {"property": "og:video"})
    if og_v and og_v.get("content"):
        return og_v["content"]
    tw_v = soup.find("meta", {"name": "twitter:player"})
    if tw_v and tw_v.get("content"):
        return tw_v["content"]
    if is_cnn(url):
        vd = soup.find(attrs={"data-video-slug": True})
        if vd:
            s = vd.get("data-video-slug", "")
            if s:
                return f"https://edition.cnn.com/videos/{s}"
    if is_bbc(url):
        fi = soup.find("iframe", {"src": re.compile(r"bbc\.co\.uk/news/av-embeds|player\.bbc\.com")})
        if fi and fi.get("src"):
            return fi["src"]
    return None


def extract_related(soup: BeautifulSoup, url: str) -> list[str]:
    """Collect same-site article URLs linked from the body (max 10)."""
    related: list[str] = []
    seen: set[str] = set()
    body_tags = soup.find_all("article") or [soup]
    for container in body_tags:
        for a in container.find_all("a", href=True):
            href = make_abs(a["href"], url)
            if href not in seen and same_family(href, url) and is_article_url(href) and href != url:
                related.append(href)
                seen.add(href)
                if len(related) >= 10:
                    break
        if len(related) >= 10:
            break
    return related


def extract_author(soup: BeautifulSoup, url: str, np_authors: list, jsonld: dict) -> dict:
    name = jsonld.get("jsonld_author_name") or (", ".join(np_authors) if np_authors else "Unknown")
    aurl = jsonld.get("jsonld_author_url")
    try:
        if is_cnn(url):
            for cls in ["byline__name", "byline-name", "Author__name"]:
                tag = soup.find(attrs={"class": re.compile(cls, re.I)})
                if tag:
                    lnk = tag if tag.name == "a" else tag.find("a", href=True)
                    if lnk and lnk.get("href"):
                        aurl = aurl or make_abs(lnk["href"], url)
                        if not np_authors:
                            name = lnk.get_text(strip=True)
                    break
        elif is_bbc(url):
            tag = soup.find(attrs={"data-testid": "byline-name"})
            if tag:
                lnk = tag if tag.name == "a" else tag.find("a", href=True)
                if lnk and lnk.get("href"):
                    aurl = aurl or make_abs(lnk["href"], url)
            if not aurl:
                for a in soup.find_all("a", href=True):
                    if "/news/correspondents/" in a["href"] or "/journalist/" in a["href"]:
                        aurl = make_abs(a["href"], url)
                        if not np_authors:
                            name = a.get_text(strip=True)
                        break
        elif is_alj(url):
            div = soup.find("div", {"class": re.compile(r"article-author|author-name", re.I)})
            if div:
                a = div.find("a", href=True)
                if a:
                    aurl = aurl or make_abs(a["href"], url)
                    if not np_authors:
                        name = a.get_text(strip=True)
    except Exception:
        pass
    return {"name": name or "Unknown", "url": aurl}
