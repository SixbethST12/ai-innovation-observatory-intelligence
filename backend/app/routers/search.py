"""
search.py — Keyword and semantic-style search over collected publications.

PURPOSE:
    Let analysts query the corpus by keyword, with optional topic and
    institution filters.

RESPONSIBILITIES:
    GET /search?q=...&topic=...&institution=...&limit=...

USED BY:
    - Frontend search bar

NOTES:
    - This is keyword search across title, abstract, ai_summary.
    - Real semantic search (embeddings) is a future enhancement; the API
      shape is designed so it can be swapped in without breaking clients.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PublicationRow
from ..schemas import SearchResult, PublicationOut


router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResult)
def search(
    q: str = Query(..., min_length=1, description="Search terms"),
    topic: Optional[str] = Query(None),
    institution: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    like = f"%{q}%"
    query = db.query(PublicationRow).filter(PublicationRow.hidden.is_(False)).filter(
        or_(
            PublicationRow.title.ilike(like),
            PublicationRow.abstract.ilike(like),
            PublicationRow.ai_summary.ilike(like),
        )
    )

    if topic:
        query = query.filter(PublicationRow.ai_topics.like(f"%{topic}%"))
    if institution:
        query = query.filter(PublicationRow.institution == institution)

    query = query.order_by(PublicationRow.published_date.desc().nullslast())
    results = query.limit(limit).all()

    return SearchResult(
        query=q,
        count=len(results),
        results=[PublicationOut.model_validate(r) for r in results],
    )
