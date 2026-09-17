"""
publications.py — API endpoints for listing and fetching publications.

PURPOSE:
    Expose stored publications with optional filters, and a detail
    endpoint to fetch one publication with its full AI output.

RESPONSIBILITIES:
    GET /publications              — list with filters + pagination
    GET /publications/{id}         — single publication detail

USED BY:
    - Frontend Publications view
    - Frontend detail modal

NOTES:
    - Filters: institution, topic, since (YYYY-MM-DD), min_relevance, limit, offset.
    - `min_relevance` is not implemented yet; reserved for later scoring.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PublicationRow
from ..schemas import PublicationOut


router = APIRouter(prefix="/publications", tags=["publications"])


@router.get("", response_model=list[PublicationOut])
def list_publications(
    institution: Optional[str] = Query(None, description="Filter by source institution"),
    topic: Optional[str] = Query(None, description="Filter by topic slug"),
    since: Optional[str] = Query(None, description="Only pubs on/after this date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(PublicationRow).filter(PublicationRow.hidden.is_(False))

    if institution:
        q = q.filter(PublicationRow.institution == institution)

    if topic:
        # ai_topics is comma-separated; LIKE is good enough for the prototype
        q = q.filter(PublicationRow.ai_topics.like(f"%{topic}%"))

    if since:
        try:
            dt = datetime.fromisoformat(since)
            q = q.filter(PublicationRow.published_date >= dt)
        except ValueError:
            raise HTTPException(400, "Invalid `since` date format; use YYYY-MM-DD")

    q = q.order_by(PublicationRow.published_date.desc().nullslast(), PublicationRow.id.desc())
    return q.offset(offset).limit(limit).all()


@router.get("/{pub_id}", response_model=PublicationOut)
def get_publication(pub_id: int, db: Session = Depends(get_db)):
    row = db.query(PublicationRow).filter(PublicationRow.id == pub_id).first()
    if not row:
        raise HTTPException(404, f"Publication {pub_id} not found")
    return row
