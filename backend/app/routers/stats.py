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
    total = db.query(func.count(PublicationRow.id)).scalar() or 0
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
