"""
cbk.py — Collector for the Central Bank of Kenya (CBK).

PURPOSE:
    Retrieve recent CBK publications, guidelines, and announcements
    via the bank's public WordPress RSS feed, and normalize each entry
    into a `Publication` record.

SOURCE:
    https://www.centralbank.go.ke/feed/
    (WordPress RSS 2.0 feed — includes prudential guidelines,
     circulars, press releases, and general announcements.)

RESPONSIBILITIES:
    1. Fetch the RSS XML.
    2. Parse with feedparser.
    3. Convert each entry into a `Publication`.
    4. Extract full content when available (CBK includes full body).

NOTES:
    - Institution is hard-coded to "CBK".
    - WordPress entries include a full `content` field; we prefer that
      over `summary` for the raw_content field.
    - Errors bubble up to BaseCollector.safe_fetch().
"""

from datetime import datetime
import feedparser
from dateutil import parser as dateparser

from .base import BaseCollector, Publication


RSS_URL = "https://www.centralbank.go.ke/feed/"


def _parse_date(entry) -> datetime | None:
    """Extract published date from a feedparser entry."""
    for key in ("published", "updated", "created"):
        if entry.get(key):
            try:
                return dateparser.parse(entry[key])
            except Exception:
                pass
    return None


def _extract_content(entry) -> str | None:
    """WordPress feeds expose full HTML in content; fall back to summary."""
    content = entry.get("content")
    if content and isinstance(content, list) and content:
        return content[0].get("value", "").strip() or None
    summary = entry.get("summary", "").strip()
    return summary or None


class CBKCollector(BaseCollector):
    institution = "CBK"

    def fetch(self) -> list[Publication]:
        feed = feedparser.parse(RSS_URL)
        if feed.bozo:
            print(f"[CBK] feed warning: {feed.bozo_exception}")

        results = []
        for entry in feed.entries:
            url = entry.get("link", "").strip()
            title = entry.get("title", "").strip()
            if not url or not title:
                continue

            results.append(Publication(
                title=title,
                institution=self.institution,
                source_url=url,
                published_date=_parse_date(entry),
                document_type="publication",
                abstract=entry.get("summary", "").strip() or None,
                raw_content=_extract_content(entry),
            ))
        return results
