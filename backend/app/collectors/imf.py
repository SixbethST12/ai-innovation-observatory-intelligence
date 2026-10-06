"""
imf.py — Collector for IMF publications (with abstract enrichment).

PURPOSE:
    Retrieve recent IMF publications and fetch a short abstract from
    each article page when the RSS relay doesn't include one.

SOURCE:
    https://rss-parrot.net/web/feeds/www.imf.org.en.publications
"""

import re
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

from .base import BaseCollector, Publication


URL = "https://rss-parrot.net/web/feeds/www.imf.org.en.publications"
DATE_PREFIX = "Published:"
MAX_ENRICH = 15  # cap page fetches per run
PAGE_TIMEOUT = 10


def _parse_date(text: str) -> datetime | None:
    if not text:
        return None
    clean = text.replace(DATE_PREFIX, "").strip()
    try:
        return dateparser.parse(clean)
    except Exception:
        return None


def _fetch_abstract(url: str) -> str | None:
    """Fetch the IMF article page and extract the first substantial paragraph."""
    try:
        r = requests.get(url, timeout=PAGE_TIMEOUT, headers={
            "User-Agent": "Mozilla/5.0 (compatible; AI-Observatory/1.0)"
        })
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "lxml")

        # Try meta description first
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            return meta["content"].strip()[:1200]

        # Try Open Graph description
        og = soup.find("meta", attrs={"property": "og:description"})
        if og and og.get("content"):
            return og["content"].strip()[:1200]

        # Try first long paragraph
        for p in soup.find_all("p"):
            txt = p.get_text(strip=True)
            if len(txt) > 150:
                return txt[:1200]
    except Exception:
        pass
    return None


class IMFCollector(BaseCollector):
    institution = "IMF"

    def fetch(self) -> list[Publication]:
        r = requests.get(URL, timeout=20)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")

        results: list[Publication] = []
        enriched = 0

        for art in soup.find_all("article", class_="post"):
            title_tag = art.find("p", class_="title")
            link_tag = art.find("p", class_="link")
            date_tag = art.find("p", class_="published")

            title = title_tag.get_text(strip=True) if title_tag else ""
            url = link_tag.find("a").get("href", "").strip() if link_tag and link_tag.find("a") else ""
            published = _parse_date(date_tag.get_text(strip=True)) if date_tag else None

            if not title or not url:
                continue

            # Try to enrich with an abstract (only first N items to keep runtime sane)
            abstract = None
            if enriched < MAX_ENRICH:
                abstract = _fetch_abstract(url)
                if abstract:
                    enriched += 1

            results.append(Publication(
                title=title,
                institution=self.institution,
                source_url=url,
                published_date=published,
                document_type="publication",
                abstract=abstract,
            ))

        if enriched:
            print(f"[IMF] enriched {enriched} publications with abstracts")

        return results
