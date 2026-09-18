"""
trends.py — Trend analysis endpoints.
"""
from fastapi import APIRouter, Query as Q, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db, SessionLocal
from ..models import PublicationRow, Source
from ..ai.trends import (
    topic_frequencies,
    topic_timeline,
    emerging_topics,
    institution_distribution,
)
from ..ai.llm import ask
from ..ai.prompts import BOT_DISCLAIMER
from ..schemas import TopicCount, InstitutionCount, EmergingTopic


router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("", response_model=list[TopicCount])
def get_topic_frequencies():
    return topic_frequencies()


@router.get("/timeline")
def get_topic_timeline():
    return topic_timeline()


@router.get("/emerging", response_model=list[EmergingTopic])
def get_emerging(months_back: int = Q(3, ge=1, le=12), top_n: int = Q(5, ge=1, le=20)):
    return emerging_topics(months_back=months_back, top_n=top_n)


@router.get("/institutions")
def get_institution_distribution(db: Session = Depends(get_db)):
    """
    Return publication counts per institution, with hidden count separate.
    Only counts publications from active sources (built-in + user sources).
    """
    BUILTIN = {"BIS", "IMF", "World Bank", "CBK"}
    custom = {row.name for row in db.query(Source).all()}
    active = BUILTIN | custom

    # Visible per source
    rows = (
        db.query(PublicationRow.institution, func.count(PublicationRow.id))
        .filter(PublicationRow.hidden.is_(False))
        .filter(PublicationRow.institution.in_(active))
        .group_by(PublicationRow.institution)
        .all()
    )
    result = [{"institution": name, "count": count} for name, count in rows]

    # Hidden count
    hidden = (
        db.query(func.count(PublicationRow.id))
        .filter(PublicationRow.hidden.is_(True))
        .scalar() or 0
    )
    orphaned = (
        db.query(func.count(PublicationRow.id))
        .filter(~PublicationRow.institution.in_(active))
        .scalar() or 0
    )

    return {
        "institutions": result,
        "hidden_count": hidden,
        "orphaned_count": orphaned,
    }


# ============================================================
# Intelligence at a Glance
# ============================================================
@router.get("/glance")
def get_glance(months_back: int = Q(3, ge=1, le=12)):
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

    slugs = [t["topic"] for t in top3]
    db = SessionLocal()
    try:
        candidates = (
            db.query(PublicationRow)
            .filter(PublicationRow.ai_processed.is_(True))
            .filter(PublicationRow.hidden.is_(False))
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

    context_lines = []
    for p in picked:
        topics = p.ai_topics or ""
        summary = (p.ai_summary or p.abstract or "").replace("\n", " ")[:220]
        context_lines.append(f"- [{p.institution}] {p.title} (topics: {topics}) — {summary}")
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
# Insights — rule-based bullets + AI narrative
# ============================================================
from ..trend_insights import generate_insights


@router.get("/insights")
def get_insights(months_back: int = Q(3, ge=1, le=12)):
    return generate_insights(months_back=months_back)
