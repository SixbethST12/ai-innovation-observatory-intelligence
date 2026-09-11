"""
base.py — Shared foundation for all data collectors.

PURPOSE:
    Defines the common contract every source collector must follow,
    so the rest of the pipeline (storage, AI, API) can treat all
    publications uniformly regardless of source.

RESPONSIBILITIES:
    1. Define the `Publication` dataclass — the normalized record shape.
    2. Provide a stable `fingerprint()` for duplicate detection.
    3. Provide `BaseCollector` — the abstract parent every collector inherits.
    4. Wrap collection in `safe_fetch()` so a single failing source
       does not crash the whole collection run.

USED BY:
    - bis.py, imf.py, worldbank.py, cbk.py  (subclasses)
    - scheduler.py                           (calls safe_fetch on all)
    - data layer                             (stores Publication.to_dict())

NOTES:
    - Do not put source-specific logic here.
    - Any new source must subclass BaseCollector and implement fetch().
"""

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional
import hashlib


@dataclass
class Publication:
    """
    Normalized publication record.

    Every collector must produce these fields, no matter the source format.
    """
    title: str
    institution: str
    source_url: str
    published_date: Optional[datetime] = None
    document_type: Optional[str] = None
    abstract: Optional[str] = None
    raw_content: Optional[str] = None

    def fingerprint(self) -> str:
        """
        Stable hash used for duplicate detection.

        Same institution + URL + title always yields the same fingerprint,
        so re-running a collector will not insert the same record twice.
        """
        base = f"{self.institution}|{self.source_url}|{self.title}"
        return hashlib.sha256(base.encode("utf-8")).hexdigest()

    def to_dict(self) -> dict:
        """Return a JSON-safe dict (datetime -> ISO string, fingerprint included)."""
        d = asdict(self)
        d["published_date"] = (
            self.published_date.isoformat() if self.published_date else None
        )
        d["fingerprint"] = self.fingerprint()
        return d


class BaseCollector:
    """
    Abstract parent for all source collectors.

    Subclasses set `institution` and implement `fetch()`.
    Callers should use `safe_fetch()` so failures are isolated.
    """
    institution: str = "UNKNOWN"

    def fetch(self) -> list[Publication]:
        """Retrieve and normalize publications from the source."""
        raise NotImplementedError

    def safe_fetch(self) -> list[Publication]:
        """Call fetch() with error handling; return [] on failure."""
        try:
            items = self.fetch()
            print(f"[{self.institution}] fetched {len(items)} publications")
            return items
        except Exception as e:
            print(f"[{self.institution}] ERROR: {e}")
            return []
