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


# ============================================================
# Intelligence at a Glance — top 3 topics + AI narrative
# ============================================================
from fastapi import Query as Q
from ..database import SessionLocal
from ..models import PublicationRow
from ..ai.trends import emerging_topics
from ..ai.llm import ask
from ..ai.prompts import BOT_DISCLAIMER


@router.get("/glance")
def get_glance(months_back: int = Q(3, ge=1, le=12)):
    """
    Return the top 3 emerging topics and an AI-generated narrative.
    Cached for 10 minutes to avoid re-hitting the LLM on every page load.
    """
    from ..cache import get as cache_get, set as cache_set
    cache_key = f"glance:{months_back}"
    cached = cache_get(cache_key, ttl_seconds=600)
    if cached is not None:
        return cached

    top3 = emerging_topics(months_back=months_back, top_n=3)

    if not top3:
        return {
            "topics": [],
            "narrative": "Not enough classified publications to detect trends yet.",
            "disclaimer": BOT_DISCLAIMER,
            "engine": "rule-based",
        }

    # Fetch 10 most recent publications that match any of the top 3 topics
    slugs = [t["topic"] for t in top3]
    db = SessionLocal()
    try:
        candidates = (
            db.query(PublicationRow)
            .filter(PublicationRow.ai_processed.is_(True))
            .order_by(PublicationRow.published_date.desc().nullslast())
            .limit(80)
            .all()
        )
        picked = []
        for row in candidates:
            if not row.ai_topics:
                continue
            row_topics = [t.strip() for t in row.ai_topics.split(",") if t.strip()]
            if any(s in row_topics for s in slugs):
                picked.append(row)
            if len(picked) >= 10:
                break
    finally:
        db.close()

    # Build context for the LLM
    context_lines = []
    for p in picked:
        topics = p.ai_topics or ""
        summary = (p.ai_summary or p.abstract or "").replace("\n", " ")[:220]
        context_lines.append(
            f"- [{p.institution}] {p.title} (topics: {topics}) — {summary}"
        )
    context = "\n".join(context_lines) if context_lines else "(no recent matching publications)"

    topic_list = ", ".join(t["topic"].replace("_", " ") for t in top3)

    prompt = f"""You are a research assistant for the Bank of Tanzania.

The top emerging topics in the last {months_back} months are: {topic_list}.

Based on the 10 most recent publications below, write a 2–3 sentence
intelligence brief for a central bank analyst. Be specific about what
is driving each topic. Do not give policy recommendations. Do not speak
on behalf of the Bank of Tanzania.

PUBLICATIONS:
{context}

BRIEF:"""

    narrative, engine = ask(prompt, task="summarize")

    result = {
        "topics": top3,
        "narrative": narrative,
        "disclaimer": BOT_DISCLAIMER,
        "engine": engine,
    }
    cache_set(cache_key, result, ttl_seconds=600)
    return result


# ============================================================
# Trend insights — rule-based bullets + AI narrative
# ============================================================
from ..trend_insights import generate_insights


@router.get("/insights")
def get_insights(months_back: int = Q(3, ge=1, le=12)):
    return generate_insights(months_back=months_back)
