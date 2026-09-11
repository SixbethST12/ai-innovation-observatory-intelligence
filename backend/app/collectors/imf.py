"""
imf.py — Collector for International Monetary Fund (IMF) publications.

PURPOSE:
    Retrieve recent IMF publications (country reports, working papers,
    technical assistance reports, policy papers) and normalize each into
    a `Publication` record.

SOURCE:
    https://rss-parrot.net/web/feeds/www.imf.org.en.publications
    (RSS Parrot mirror of IMF's publications page. IMF blocks direct
     RSS/SDMX access to publications, so we parse the relay page as HTML.)

RESPONSIBILITIES:
    1. Fetch the RSS Parrot HTML page.
    2. Parse each <article class="post"> block with BeautifulSoup.
    3. Extract title, link, published date, and description.
    4. Normalize into `Publication` records.

NOTES:
    - Institution is hard-coded to "IMF".
    - The date format is "Published: November 7, 2025 08:00" — we strip
      the "Published: " prefix and parse with dateutil.
    - If RSS Parrot ever goes down, this collector will return [] and the
      pipeline continues (safe_fetch handles errors).
"""

import re
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

from .base import BaseCollector, Publication


URL = "https://rss-parrot.net/web/feeds/www.imf.org.en.publications"
DATE_PREFIX = "Published:"


def _parse_date(text: str) -> datetime | None:
    """Strip the 'Published: ' prefix and parse the date."""
    if not text:
        return None
    clean = text.replace(DATE_PREFIX, "").strip()
    try:
        return dateparser.parse(clean)
    except Exception:
        return None


class IMFCollector(BaseCollector):
    institution = "IMF"

    def fetch(self) -> list[Publication]:
        r = requests.get(URL, timeout=20)
        r.raise_for_status()

        soup = BeautifulSoup(r.text, "lxml")
        results: list[Publication] = []

        for art in soup.find_all("article", class_="post"):
            title_tag = art.find("p", class_="title")
            link_tag = art.find("p", class_="link")
            date_tag = art.find("p", class_="published")
            desc_tag = art.find("p", class_="description")

            title = title_tag.get_text(strip=True) if title_tag else ""
            url = ""
            if link_tag and link_tag.find("a"):
                url = link_tag.find("a").get("href", "").strip()
            published = _parse_date(date_tag.get_text(strip=True)) if date_tag else None
            description = desc_tag.get_text(strip=True) if desc_tag else None

            if not title or not url:
                continue

            results.append(Publication(
                title=title,
                institution=self.institution,
                source_url=url,
                published_date=published,
                document_type="publication",
                abstract=description or None,
            ))

        return results
