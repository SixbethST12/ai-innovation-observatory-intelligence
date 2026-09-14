"""
admin.py — Admin-only endpoints for the Observatory.

PURPOSE:
    Provide the Admin panel with control over data collection, AI
    processing, and system configuration.

RESPONSIBILITIES:
    GET  /admin/logs            — last run info + counts
    GET  /admin/system          — DB and LLM info
    POST /admin/collect         — start data collection (background)
    POST /admin/process-ai      — start AI pipeline (background)
    GET  /admin/jobs            — status of background jobs
    GET  /admin/sources         — list configured sources
    GET  /admin/topics          — list 11 canonical topics

NOTES:
    - No real authentication in the prototype. Access control happens
      client-side (login screen). Documented as prototype limitation.
    - Long jobs run in background threads via app.jobs.manager.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import PublicationRow
from ..config import LLM_MODEL, OLLAMA_URL
from ..topics import TOPICS
from ..jobs.manager import start_job, get_status


router = APIRouter(prefix="/admin", tags=["admin"])


def _run_collection():
    """Collect from all sources + save new rows. Returns summary."""
    from ..collectors.scheduler import run_all
    from ..storage import save_publications
    pubs = run_all()
    result = save_publications(pubs)
    return result


def _run_ai():
    """Run the AI pipeline on all unprocessed publications."""
    from ..ai.pipeline import process_pending
    return process_pending()


@router.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    """Return counts and job states for the admin dashboard."""
    total = db.query(func.count(PublicationRow.id)).scalar() or 0
    processed = (
        db.query(func.count(PublicationRow.id))
        .filter(PublicationRow.ai_processed.is_(True))
        .scalar() or 0
    )
    by_source = (
        db.query(PublicationRow.institution, func.count(PublicationRow.id))
        .group_by(PublicationRow.institution)
        .all()
    )
    return {
        "total_publications": total,
        "processed": processed,
        "pending": total - processed,
        "by_source": [{"institution": i, "count": c} for i, c in by_source],
        "jobs": get_status(),
    }


@router.get("/system")
def get_system():
    """Return LLM and runtime config info."""
    return {
        "llm_model": LLM_MODEL,
        "ollama_url": OLLAMA_URL,
        "topics_count": len(TOPICS),
    }


@router.post("/collect")
def trigger_collection():
    """Start data collection in the background."""
    state = start_job("collect", _run_collection)
    return {"job": "collect", **state}


@router.post("/process-ai")
def trigger_ai():
    """Start AI pipeline in the background."""
    state = start_job("ai", _run_ai)
    return {"job": "ai", **state}


@router.get("/jobs")
def jobs_status():
    """Return current state of background jobs."""
    return get_status()


@router.get("/sources")
def list_sources():
    """List the approved sources (from collectors)."""
    return [
        {"name": "BIS",        "url": "https://www.bis.org",              "method": "RSS"},
        {"name": "IMF",        "url": "https://www.imf.org",              "method": "RSS (via RSS Parrot)"},
        {"name": "World Bank", "url": "https://www.worldbank.org",        "method": "REST API"},
        {"name": "CBK",        "url": "https://www.centralbank.go.ke",    "method": "RSS"},
    ]


@router.get("/topics")
def list_topics():
    """List the 11 canonical topic categories."""
    return [
        {"slug": slug, "label": meta["label"], "keywords": meta["keywords"]}
        for slug, meta in TOPICS.items()
    ]


# ============================================================
# User management (prototype only)
# ============================================================
from pydantic import BaseModel
from .. import users as users_store


class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    full_name: str = ""


@router.get("/users")
def list_users():
    return users_store.list_users()


@router.post("/users")
def create_user(payload: UserCreate):
    try:
        return users_store.create_user(
            username=payload.username,
            password=payload.password,
            role=payload.role,
            full_name=payload.full_name,
        )
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))


@router.delete("/users/{user_id}")
def delete_user(user_id: int):
    try:
        users_store.delete_user(user_id)
        return {"deleted": user_id}
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))
