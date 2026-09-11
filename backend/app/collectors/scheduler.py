"""
scheduler.py — Coordinates all source collectors.

PURPOSE:
    Provide a single entry point that runs every collector, aggregates
    the results, and returns a unified list of Publications ready for
    storage in the data layer.

RESPONSIBILITIES:
    1. Instantiate every collector (BIS, IMF, World Bank, CBK).
    2. Call safe_fetch() on each (isolated failures).
    3. Aggregate and return the combined list.
    4. Print a summary per source.

USED BY:
    - CLI: `python -m app.collectors.scheduler`
    - Later: FastAPI background task or APScheduler job.

NOTES:
    - Does NOT write to the database yet. Storage comes in Layer 3.
    - To add a new source: import its collector and append to COLLECTORS.
"""

from .bis import BISCollector
from .cbk import CBKCollector
from .imf import IMFCollector
from .worldbank import WorldBankCollector
from .base import Publication


COLLECTORS = [
    BISCollector(),
    CBKCollector(),
    IMFCollector(),
    WorldBankCollector(),
]


def run_all() -> list[Publication]:
    """Run every collector and return the combined list of publications."""
    all_pubs: list[Publication] = []
    summary: dict[str, int] = {}

    for collector in COLLECTORS:
        items = collector.safe_fetch()
        summary[collector.institution] = len(items)
        all_pubs.extend(items)

    print("\n=== Collection summary ===")
    for name, count in summary.items():
        print(f"  {name:15} {count:>4} publications")
    print(f"  {'TOTAL':15} {len(all_pubs):>4} publications")

    return all_pubs


if __name__ == "__main__":
    pubs = run_all()
    print(f"\nDone. Collected {len(pubs)} publications.")
