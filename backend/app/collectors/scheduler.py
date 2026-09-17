"""
scheduler.py — Coordinates all source collectors (built-in + DB).

PURPOSE:
    Run every collector: the 4 built-in ones + any user-added RSS
    sources stored in the `sources` table.

RESPONSIBILITIES:
    1. Run built-in collectors (BIS, IMF, World Bank, CBK).
    2. Load active RSS sources from the DB and run them too.
    3. Aggregate and return the combined list of Publications.
    4. Print a summary per source.

USED BY:
    - CLI: `python -m app.collectors.scheduler`
    - app/routers/admin.py (POST /admin/collect)
    - APScheduler job (auto-collect)

NOTES:
    - Does NOT write to the DB — that's storage.save_publications.
    - User sources are RSS-only for now (method="rss").
"""

from .bis import BISCollector
from .cbk import CBKCollector
from .imf import IMFCollector
from .worldbank import WorldBankCollector
from .generic_rss import GenericRSSCollector
from .base import Publication


BUILTIN_COLLECTORS = [
    BISCollector(),
    CBKCollector(),
    IMFCollector(),
    WorldBankCollector(),
]


def _load_user_sources() -> list[GenericRSSCollector]:
    """Fetch active user-added RSS sources from DB."""
    try:
        from ..database import SessionLocal
        from ..models import Source
        db = SessionLocal()
        try:
            rows = db.query(Source).filter(Source.active.is_(True)).all()
            return [GenericRSSCollector(institution=r.name, feed_url=r.url) for r in rows]
        finally:
            db.close()
    except Exception as e:
        print(f"[scheduler] could not load user sources: {e}")
        return []


def run_all() -> list[Publication]:
    """Run built-in + user collectors, return combined list."""
    all_pubs: list[Publication] = []
    summary: dict[str, int] = {}

    # Built-ins
    for collector in BUILTIN_COLLECTORS:
        items = collector.safe_fetch()
        summary[collector.institution] = len(items)
        all_pubs.extend(items)

    # User-added RSS sources
    for collector in _load_user_sources():
        items = collector.safe_fetch()
        summary[collector.institution] = len(items)
        all_pubs.extend(items)

    print("\n=== Collection summary ===")
    for name, count in summary.items():
        print(f"  {name:25} {count:>4} publications")
    print(f"  {'TOTAL':25} {len(all_pubs):>4} publications")

    return all_pubs


if __name__ == "__main__":
    pubs = run_all()
    print(f"\nDone. Collected {len(pubs)} publications.")
