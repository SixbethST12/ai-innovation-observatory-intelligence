"""
stats.py — Dashboard summary statistics.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PublicationRow, Source
from ..schemas import StatsOut
from ..topics import TOPIC_SLUGS


router = APIRouter(prefix="/stats", tags=["stats"])

BUILTIN_SOURCES = {"BIS", "IMF", "World Bank", "CBK"}


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    # Active sources = built-ins + user sources
    custom = {row.name for row in db.query(Source).all()}
    active_sources = BUILTIN_SOURCES | custom

    # Publications from active sources only
    visible_pubs = (
        db.query(func.count(PublicationRow.id))
        .filter(PublicationRow.hidden.is_(False))
        .filter(PublicationRow.institution.in_(active_sources))
        .scalar() or 0
    )

    # Hidden check
    total_unfiltered = (
        db.query(func.count(PublicationRow.id))
        .filter(PublicationRow.hidden.is_(False))
        .scalar() or 0
    )

    processed = (
        db.query(func.count(PublicationRow.id))
        .filter(PublicationRow.ai_processed.is_(True))
        .filter(PublicationRow.hidden.is_(False))
        .scalar() or 0
    )

    # Orphaned institutions
    present = {name for (name,) in db.query(PublicationRow.institution).distinct().all()}
    orphaned = sorted(present - active_sources)

    return {
        "total_publications": total_unfiltered,
        "visible_publications": visible_pubs,
        "total_processed": processed,
        "total_institutions": len(active_sources),
        "total_topics": len(TOPIC_SLUGS),
        "orphaned_institutions": orphaned,
    }


@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    rows = (
        db.query(
            func.strftime("%Y-%m", PublicationRow.published_date).label("month"),
            func.count(PublicationRow.id).label("count"),
        )
        .filter(PublicationRow.published_date.isnot(None))
        .filter(PublicationRow.hidden.is_(False))
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "count": r.count} for r in rows if r.month]
