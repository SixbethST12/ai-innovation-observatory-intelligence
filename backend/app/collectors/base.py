from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
import hashlib


@dataclass
class Publication:
    """Normalized publication record — every collector returns these."""
    title: str
    institution: str          # "BIS", "IMF", "World Bank", "CBK"
    source_url: str
    published_date: Optional[datetime] = None
    document_type: Optional[str] = None   # "working_paper", "speech", "report"
    abstract: Optional[str] = None
    raw_content: Optional[str] = None

    def fingerprint(self) -> str:
        """Stable hash used for duplicate detection."""
        base = f"{self.institution}|{self.source_url}|{self.title}"
        return hashlib.sha256(base.encode("utf-8")).hexdigest()

    def to_dict(self) -> dict:
        d = asdict(self)
        d["published_date"] = (
            self.published_date.isoformat() if self.published_date else None
        )
        d["fingerprint"] = self.fingerprint()
        return d


class BaseCollector:
    """Every source collector inherits from this."""
    institution: str = "UNKNOWN"

    def fetch(self) -> list[Publication]:
        """Must return a list of Publication objects."""
        raise NotImplementedError

    def safe_fetch(self) -> list[Publication]:
        """Wrap fetch() with error handling so one bad source doesn't crash the run."""
        try:
            items = self.fetch()
            print(f"[{self.institution}] fetched {len(items)} publications")
            return items
        except Exception as e:
            print(f"[{self.institution}] ERROR: {e}")
            return []