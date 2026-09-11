"""
schemas.py — Pydantic response models for the API layer.

PURPOSE:
    Define the JSON shape returned by every FastAPI endpoint, so the
    frontend can rely on a stable contract.

RESPONSIBILITIES:
    1. Describe a Publication as returned by /publications.
    2. Describe stats/trends response shapes.
    3. Enable automatic OpenAPI docs at /docs.

USED BY:
    - app/routers/publications.py
    - app/routers/search.py
    - app/routers/trends.py
    - app/routers/stats.py

NOTES:
    - `from_attributes = True` lets Pydantic read from SQLAlchemy rows.
    - Dates are ISO strings in JSON.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PublicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    institution: str
    source_url: str
    published_date: Optional[datetime] = None
    document_type: Optional[str] = None
    abstract: Optional[str] = None

    # AI fields
    ai_summary: Optional[str] = None
    ai_topics: Optional[str] = None      # comma-separated slugs
    ai_relevance: Optional[str] = None
    ai_engine: Optional[str] = None
    ai_processed: bool = False
    ai_processed_at: Optional[datetime] = None

    collected_at: datetime


class TopicCount(BaseModel):
    topic: str
    count: int


class InstitutionCount(BaseModel):
    institution: str
    count: int


class EmergingTopic(BaseModel):
    topic: str
    recent: int
    prior: int
    score: int


class StatsOut(BaseModel):
    total_publications: int
    total_processed: int
    total_institutions: int
    total_topics: int


class SearchResult(BaseModel):
    query: str
    count: int
    results: list[PublicationOut]
