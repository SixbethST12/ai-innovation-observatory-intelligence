"""
bis.py — Collector for the Bank for International Settlements (BIS).

PURPOSE:
    Retrieve recent BIS publications via its public RSS feeds and
    normalize each entry into a `Publication` record.

SOURCES (verified working):
    - https://www.bis.org/doclist/all_pressrels.rss     (press releases)
    - https://www.bis.org/doclist/cbspeeches.rss        (central bank speeches)
    - https://www.bis.org/doclist/mgmtspeeches.rss      (BIS management speeches)

RESPONSIBILITIES:
    1. Fetch each configured BIS RSS feed.
    2. Parse with feedparser (robust against minor RSS quirks).
    3. Convert each entry into a `Publication`.
    4. Merge + deduplicate results across feeds by fingerprint.

NOTES:
    - Institution is hard-coded to "BIS".
    - Document type is derived from the feed the entry came from.
    - Errors bubble up to BaseCollector.safe_fetch() for isolation.
"""

from datetime import datetime
import feedparser
from dateutil import parser as dateparser

from .base import BaseCollector, Publication


# (feed_url, document_type)
BIS_FEEDS = [
    ("https://www.bis.org/doclist/all_pressrels.rss",  "press_release"),
    ("https://www.bis.org/doclist/cbspeeches.rss",     "speech"),
    ("https://www.bis.org/doclist/mgmtspeeches.rss",   "speech"),
]


def _parse_date(entry) -> datetime | None:
    """Extract published date from a feedparser entry."""
    for key in ("published", "updated", "created"):
        if entry.get(key):
            try:
                return dateparser.parse(entry[key])
            except Exception:
                pass
    return None


class BISCollector(BaseCollector):
    institution = "BIS"

    def fetch(self) -> list[Publication]:
        results: list[Publication] = []
        seen: set[str] = set()

        for feed_url, doc_type in BIS_FEEDS:
            feed = feedparser.parse(feed_url)
            if feed.bozo:
                print(f"[BIS] feed warning on {feed_url}: {feed.bozo_exception}")

            for entry in feed.entries:
                url = entry.get("link", "").strip()
                title = entry.get("title", "").strip()
                if not url or not title:
                    continue

                pub = Publication(
                    title=title,
                    institution=self.institution,
                    source_url=url,
                    published_date=_parse_date(entry),
                    document_type=doc_type,
                    abstract=entry.get("summary", "").strip() or None,
                )

                fp = pub.fingerprint()
                if fp in seen:
                    continue
                seen.add(fp)
                results.append(pub)

        return results
