"""Rate-limited HTTP: shared session, candidate crawling, optional JS render.

``crawl_source`` discovers candidate article links from a section/index page.
``fetch_rendered_html`` uses Playwright for JS-heavy sources (Yahoo TW); it is
imported lazily so the dependency is only needed when actually scraping Yahoo.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

from core import config
from core.cleaner import JUNK, dom, is_article_url, make_abs, same_family

_log = logging.getLogger(__name__)

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": config.USER_AGENT})


def get(url: str, timeout: int = config.REQUEST_TIMEOUT) -> Optional[requests.Response]:
    """GET with per-domain rate limiting. Returns None on any failure."""
    rl = config.RATE_LIMIT  # domain -> next-allowed timestamp
    domain = dom(url)
    wait = rl[domain] - time.time()
    if wait > 0:
        time.sleep(wait)
    try:
        r = _SESSION.get(url, timeout=timeout)
        rl[domain] = time.time() + config.RATE_DELAY
        r.raise_for_status()
        return r
    except Exception as e:                       # noqa: BLE001 - log + continue
        _log.debug("GET failed %s: %s", url, e)
        return None


def fetch_soup(url: str, timeout: int = config.REQUEST_TIMEOUT) -> Optional[BeautifulSoup]:
    r = get(url, timeout=timeout)
    if not r:
        return None
    return BeautifulSoup(r.text, "html.parser")


def fetch_rendered_html(url: str, timeout: int = 30) -> Optional[str]:
    """Render a JS page with Playwright and return its HTML (lazy import).

    Used for Yahoo TW, which renders article lists/content client-side.
    Returns None if Playwright is unavailable or rendering fails.
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:                       # noqa: BLE001
        _log.warning("Playwright unavailable (%s); JS render skipped for %s", e, url)
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=config.USER_AGENT)
            page.goto(url, wait_until="domcontentloaded", timeout=timeout * 1000)
            page.wait_for_timeout(1500)          # let lazy content settle
            html = page.content()
            browser.close()
            return html
    except Exception as e:                        # noqa: BLE001
        _log.warning("Playwright render failed for %s: %s", url, e)
        return None


def crawl_source(source_url: str, category: str, max_cand: int,
                 *, rendered: bool = False) -> list[dict]:
    """Collect candidate {url, topic, title_hint} dicts from one index page."""
    results: list[dict] = []
    seen: set[str] = set()
    print(f"  search {source_url}")

    if rendered:
        html = fetch_rendered_html(source_url)
        soup = BeautifulSoup(html, "html.parser") if html else None
    else:
        soup = fetch_soup(source_url)

    if soup is None:
        print("     failed")
        return []

    for tag in soup.find_all("a", href=True):
        url = make_abs(tag["href"], source_url)
        if not same_family(url, source_url) or not is_article_url(url) or url in seen:
            continue
        hint = tag.get("aria-label", "").strip()
        if not hint:
            for tn in ("h1", "h2", "h3", "h4", "span", "p"):
                el = tag.find(tn)
                if el:
                    cand = el.get_text(strip=True)
                    if len(cand) >= 20 and not JUNK.search(cand):
                        hint = cand
                        break
        if not hint:
            raw = tag.get_text(strip=True)
            if len(raw) >= 20 and not JUNK.search(raw):
                hint = raw
        if not hint:
            continue
        seen.add(url)
        results.append({"url": url, "topic": category, "title_hint": hint, "source_url": source_url})
        if len(results) >= max_cand:
            break

    print(f"     -> {len(results)} candidates")
    return results
