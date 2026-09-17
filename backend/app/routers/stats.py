"""
stats.py — API endpoints for dashboard summary statistics.

PURPOSE:
    Provide the numbers shown on the Overview page (total publications,
    processed count, institution count, topic count).

RESPONSIBILITIES:
    GET /stats — summary card data

USED BY:
    - Frontend Overview StatCards

NOTES:
    - Counts are computed with cheap SQL COUNT queries.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PublicationRow
from ..schemas import StatsOut
from ..topics import TOPIC_SLUGS


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(PublicationRow.id)).filter(PublicationRow.hidden.is_(False)).scalar() or 0
    processed = (
        db.query(func.count(PublicationRow.id))
        .filter(PublicationRow.ai_processed.is_(True))
        .scalar() or 0
    )
    institutions = (
        db.query(func.count(func.distinct(PublicationRow.institution))).scalar() or 0
    )
    return StatsOut(
        total_publications=total,
        total_processed=processed,
        total_institutions=institutions,
        total_topics=len(TOPIC_SLUGS),
    )


@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    """
    Publications per month.

    Returns: [{"month": "2026-09", "count": 42}, ...]
    Used by the dashboard publication timeline chart.
    """
    from sqlalchemy import func as sqlfunc
    rows = (
        db.query(
            sqlfunc.strftime("%Y-%m", PublicationRow.published_date).label("month"),
            sqlfunc.count(PublicationRow.id).label("count"),
        )
        .filter(PublicationRow.published_date.isnot(None))
        .filter(PublicationRow.hidden.is_(False))
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "count": r.count} for r in rows if r.month]
