"""
worldbank.py — Collector for World Bank publications.

PURPOSE:
    Retrieve recent World Bank research, reports, and policy documents
    relevant to the 11 central-banking topic categories, using the
    World Bank Documents & Reports Search API (v3).

SOURCE:
    https://search.worldbank.org/api/v3/wds
    (JSON API over the World Bank Documents & Reports repository.)

RESPONSIBILITIES:
    1. Run one query per topic category (topics.py).
    2. Extract title, abstract, date, and canonical URL per document.
    3. Normalize into `Publication` records.
    4. Deduplicate across topic queries by fingerprint.

NOTES:
    - Institution is hard-coded to "World Bank".
    - Topic list comes from app.topics (single source of truth).
    - Each Publication is tagged with the topic slug that found it,
      via the `document_type` field (e.g. "report") plus the abstract.
      Real topic classification happens later in the AI layer.
    - API pagination via `os` (offset); we cap rows per query.
"""

from datetime import datetime
import requests
from dateutil import parser as dateparser

from .base import BaseCollector, Publication
from ..topics import TOPICS


API_URL = "https://search.worldbank.org/api/v3/wds"
ROWS_PER_TOPIC = 5   # 11 topics x 5 = up to 55 publications per run


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return dateparser.parse(raw)
    except Exception:
        return None


def _extract_title(doc: dict) -> str | None:
    if doc.get("display_title"):
        return doc["display_title"].strip()
    docna = doc.get("docna")
    if isinstance(docna, dict) and "0" in docna:
        return docna["0"].get("docna", "").strip() or None
    return None


def _extract_abstract(doc: dict) -> str | None:
    ab = doc.get("abstracts")
    if isinstance(ab, dict):
        text = ab.get("cdata!") or ab.get("abstract")
        if isinstance(text, str):
            return text.strip()
    return None


class WorldBankCollector(BaseCollector):
    institution = "World Bank"

    def fetch(self) -> list[Publication]:
        results: list[Publication] = []
        seen: set[str] = set()

        for slug, meta in TOPICS.items():
            # Use the first keyword as the query for that topic
            term = meta["keywords"][0]

            params = {
                "format": "json",
                "rows": ROWS_PER_TOPIC,
                "qterm": term,
                "fl": "docna,docdt,url,pdfurl,txturl,docty,abstracts,display_title",
            }
            try:
                r = requests.get(API_URL, params=params, timeout=20)
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                print(f"[World Bank] topic '{slug}' query failed: {e}")
                continue

            docs = (data.get("documents") or {}).values()
            for doc in docs:
                url = (doc.get("url") or "").strip()
                title = _extract_title(doc)
                if not url or not title:
                    continue

                pub = Publication(
                    title=title,
                    institution=self.institution,
                    source_url=url,
                    published_date=_parse_date(doc.get("docdt")),
                    document_type=(doc.get("docty") or "report").lower().replace(" ", "_"),
                    abstract=_extract_abstract(doc),
                )

                fp = pub.fingerprint()
                if fp in seen:
                    continue
                seen.add(fp)
                results.append(pub)

        return results
