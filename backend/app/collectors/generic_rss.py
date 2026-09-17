"""
generic_rss.py — Collect publications from any RSS/Atom feed.

PURPOSE:
    Let users add arbitrary RSS sources at runtime. Used for both
    user-added feeds and any additional built-in feeds we want to
    include later.

RESPONSIBILITIES:
    1. Fetch an RSS URL.
    2. Parse with feedparser.
    3. Normalize into Publication objects.
"""

from datetime import datetime

import feedparser
from dateutil import parser as dateparser

from .base import BaseCollector, Publication


def _parse_date(entry) -> datetime | None:
    for key in ("published", "updated", "created"):
        if entry.get(key):
            try:
                return dateparser.parse(entry[key])
            except Exception:
                pass
    return None


class GenericRSSCollector(BaseCollector):
    """
    Fetch any RSS feed. Institution is set per-instance.

    Usage:
        c = GenericRSSCollector("Bank of England", "https://www.bankofengland.co.uk/feed")
        pubs = c.safe_fetch()
    """

    def __init__(self, institution: str, feed_url: str):
        self.institution = institution
        self.feed_url = feed_url

    def fetch(self) -> list[Publication]:
        feed = feedparser.parse(self.feed_url)
        if feed.bozo:
            print(f"[{self.institution}] feed warning: {feed.bozo_exception}")

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
            ))
        return results
