"""
trends.py — API endpoints for topic trends and emerging themes.

PURPOSE:
    Serve pre-computed trend data from app.ai.trends to the dashboard.

RESPONSIBILITIES:
    GET /trends              — topic frequencies
    GET /trends/timeline     — topic mentions per month
    GET /trends/emerging     — top emerging topics
    GET /trends/institutions — publications per source

USED BY:
    - Frontend Trends view
    - Frontend Overview dashboard

NOTES:
    - No LLM calls here; all computation is on the DB.
"""

from fastapi import APIRouter, Query

from ..ai.trends import (
    topic_frequencies,
    topic_timeline,
    emerging_topics,
    institution_distribution,
)
from ..schemas import TopicCount, InstitutionCount, EmergingTopic


router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("", response_model=list[TopicCount])
def get_topic_frequencies():
    return topic_frequencies()


@router.get("/timeline")
def get_topic_timeline():
    return topic_timeline()


@router.get("/emerging", response_model=list[EmergingTopic])
def get_emerging(months_back: int = Query(3, ge=1, le=12), top_n: int = Query(5, ge=1, le=20)):
    return emerging_topics(months_back=months_back, top_n=top_n)


@router.get("/institutions", response_model=list[InstitutionCount])
def get_institution_distribution():
    return institution_distribution()
