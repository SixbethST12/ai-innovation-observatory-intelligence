"""
trends.py — Compute emerging topic trends over time.

PURPOSE:
    Analyze classified publications to surface topic frequencies,
    month-over-month changes, and emerging themes.

RESPONSIBILITIES:
    1. `topic_frequencies()` — how many pubs per topic (all-time).
    2. `topic_timeline()` — pubs per topic per month (for charts).
    3. `emerging_topics()` — topics with the biggest recent uptick.
    4. `institution_distribution()` — pubs per source.

USED BY:
    - app/routers/trends.py   (API endpoints)
    - app/routers/stats.py    (dashboard widgets)

NOTES:
    - Reads only from `publications` table where ai_topics is not null.
    - All computations are on the DB; no LLM is involved.
    - Topic strings are stored comma-separated; we split in Python.
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from ..database import SessionLocal
from ..models import PublicationRow


def _all_classified():
    """Return rows that have at least one AI topic assigned."""
    s = SessionLocal()
    try:
        rows = (
            s.query(PublicationRow)
            .filter(PublicationRow.ai_topics.isnot(None))
            .all()
        )
        return rows
    finally:
        s.close()


def _split_topics(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [t.strip() for t in raw.split(",") if t.strip()]


def topic_frequencies() -> list[dict]:
    """Return [{topic, count}] sorted by count desc."""
    counts = Counter()
    for row in _all_classified():
        for t in _split_topics(row.ai_topics):
            counts[t] += 1
    return [{"topic": t, "count": c} for t, c in counts.most_common()]


def topic_timeline() -> dict:
    """
    Return {topic: {YYYY-MM: count}} for every topic.

    Used by the frontend to draw trend lines per topic.
    """
    timeline: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in _all_classified():
        if not row.published_date:
            continue
        month = row.published_date.strftime("%Y-%m")
        for t in _split_topics(row.ai_topics):
            timeline[t][month] += 1
    # convert defaultdicts to plain dicts for JSON
    return {t: dict(months) for t, months in timeline.items()}


def institution_distribution() -> list[dict]:
    """Return [{institution, count}] sorted by count desc."""
    s = SessionLocal()
    try:
        rows = s.query(PublicationRow.institution).all()
    finally:
        s.close()
    counts = Counter(r[0] for r in rows if r[0])
    return [{"institution": k, "count": v} for k, v in counts.most_common()]


def emerging_topics(months_back: int = 3, top_n: int = 5) -> list[dict]:
    """
    Return topics whose recent activity is higher than the prior period.

    Compares the last `months_back` months against the same-length period
    immediately before it. Score = recent_count - prior_count.
    """
    now = datetime.now(timezone.utc)
    recent_start = now - timedelta(days=30 * months_back)
    prior_start = recent_start - timedelta(days=30 * months_back)

    recent = Counter()
    prior = Counter()

    for row in _all_classified():
        if not row.published_date:
            continue
        # SQLite returns naive datetimes; make them UTC-aware for comparison
        dt = row.published_date
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        for t in _split_topics(row.ai_topics):
            if dt >= recent_start:
                recent[t] += 1
            elif dt >= prior_start:
                prior[t] += 1

    scored = []
    for topic in set(recent) | set(prior):
        score = recent[topic] - prior[topic]
        scored.append({
            "topic": topic,
            "recent": recent[topic],
            "prior": prior[topic],
            "score": score,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]
