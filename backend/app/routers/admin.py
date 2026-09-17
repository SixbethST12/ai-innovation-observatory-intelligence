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


# ============================================================
# Service control (prototype)
# ============================================================
from .. import services as svc


@router.get("/services")
def list_services():
    return svc.get_status()


@router.post("/services/{name}/restart")
def restart_service(name: str):
    try:
        return svc.restart(name)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))


@router.get("/services/{name}/logs")
def service_logs(name: str, lines: int = 60):
    try:
        return svc.get_logs(name, lines)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))


# ============================================================
# System alerts
# ============================================================
from ..alerts import generate_alerts


@router.get("/alerts")
def get_alerts():
    return generate_alerts()


# ============================================================
# Alert Rules — CRUD + matches
# ============================================================
from ..models import AlertRule, RuleMatch, PublicationRow


class RuleCreate(BaseModel):
    keyword: str
    source: str = "all"
    topic: str = "all"
    priority: str = "medium"
    created_by: str = ""


class RuleOut(BaseModel):
    id: int
    keyword: str
    source: str | None
    topic: str | None
    priority: str
    created_by: str | None
    active: bool


@router.get("/rules", response_model=list[RuleOut])
def list_rules(db: Session = Depends(get_db)):
    return db.query(AlertRule).order_by(AlertRule.id.desc()).all()


@router.post("/rules", response_model=RuleOut)
def create_rule(payload: RuleCreate, db: Session = Depends(get_db)):
    if not payload.keyword.strip():
        from fastapi import HTTPException
        raise HTTPException(400, "Keyword is required")
    rule = AlertRule(
        keyword=payload.keyword.strip(),
        source=payload.source,
        topic=payload.topic,
        priority=payload.priority,
        created_by=payload.created_by or "anonymous",
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        from fastapi import HTTPException
        raise HTTPException(404, f"Rule {rule_id} not found")
    db.query(RuleMatch).filter(RuleMatch.rule_id == rule_id).delete()
    db.delete(rule)
    db.commit()
    return {"deleted": rule_id}


@router.get("/rules/matches")
def list_matches(limit: int = 50, db: Session = Depends(get_db)):
    """Return recent rule matches with rule + publication info."""
    rows = (
        db.query(RuleMatch, AlertRule, PublicationRow)
        .join(AlertRule, AlertRule.id == RuleMatch.rule_id)
        .join(PublicationRow, PublicationRow.id == RuleMatch.publication_id)
        .order_by(RuleMatch.matched_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "match_id": m.id,
            "matched_at": m.matched_at.isoformat() if m.matched_at else None,
            "rule": {
                "id": r.id,
                "keyword": r.keyword,
                "source": r.source,
                "topic": r.topic,
                "priority": r.priority,
            },
            "publication": {
                "id": p.id,
                "title": p.title,
                "institution": p.institution,
                "source_url": p.source_url,
                "published_date": p.published_date.isoformat() if p.published_date else None,
            },
        }
        for m, r, p in rows
    ]


# ============================================================
# Activity feed
# ============================================================
@router.get("/activity")
def get_activity(limit: int = 15):
    from ..activity import build_activity
    return build_activity(limit=limit)


# ============================================================
# Scheduler control
# ============================================================
from apscheduler.schedulers.background import BackgroundScheduler

_scheduler = BackgroundScheduler(timezone="UTC")
_scheduler_job = {"id": None, "interval_minutes": None}


def _scheduled_collect():
    from ..collectors.scheduler import run_all
    from ..storage import save_publications
    try:
        result = save_publications(run_all())
        print(f"[scheduler] auto-collect: {result}")
    except Exception as e:
        print(f"[scheduler] auto-collect failed: {e}")


@router.get("/scheduler/status")
def scheduler_status():
    return {
        "running": _scheduler.running and _scheduler_job["id"] is not None,
        "interval_minutes": _scheduler_job["interval_minutes"],
        "next_run": str(_scheduler.get_job(_scheduler_job["id"]).next_run_time) if _scheduler_job["id"] else None,
    }


class SchedulerStart(BaseModel):
    interval_minutes: int = 60


@router.post("/scheduler/start")
def scheduler_start(payload: SchedulerStart):
    if not _scheduler.running:
        _scheduler.start()
    # Remove existing job if any
    if _scheduler_job["id"]:
        try:
            _scheduler.remove_job(_scheduler_job["id"])
        except Exception:
            pass
    job = _scheduler.add_job(
        _scheduled_collect,
        "interval",
        minutes=payload.interval_minutes,
        id="auto_collect",
    )
    _scheduler_job["id"] = job.id
    _scheduler_job["interval_minutes"] = payload.interval_minutes
    return {"started": True, "interval_minutes": payload.interval_minutes}


@router.post("/scheduler/stop")
def scheduler_stop():
    if _scheduler_job["id"]:
        try:
            _scheduler.remove_job(_scheduler_job["id"])
        except Exception:
            pass
        _scheduler_job["id"] = None
        _scheduler_job["interval_minutes"] = None
    return {"stopped": True}


@router.post("/retry-failed")
def retry_failed():
    """Reset rule-based rows so the AI pipeline reprocesses them."""
    from ..models import PublicationRow
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(PublicationRow).filter(PublicationRow.ai_engine == "rule-based").update({
            PublicationRow.ai_processed: False,
            PublicationRow.ai_summary: None,
            PublicationRow.ai_topics: None,
            PublicationRow.ai_relevance: None,
            PublicationRow.ai_engine: None,
            PublicationRow.ai_processed_at: None,
        }, synchronize_session=False)
        db.commit()
        return {"reset": count, "message": f"{count} rows reset for AI reprocessing"}
    finally:
        db.close()


# ============================================================
# Source management (user-added RSS)
# ============================================================
from ..models import Source


class SourceCreate(BaseModel):
    name: str
    url: str


@router.get("/sources/list")
def list_user_sources(db: Session = Depends(get_db)):
    """List user-added sources (built-in 4 are in the hardcoded /sources endpoint)."""
    rows = db.query(Source).order_by(Source.added_at.desc()).all()
    return [
        {
            "id": r.id, "name": r.name, "url": r.url, "method": r.method,
            "active": r.active, "added_at": r.added_at.isoformat() if r.added_at else None,
        }
        for r in rows
    ]


@router.post("/sources/list")
def add_source(payload: SourceCreate, db: Session = Depends(get_db)):
    """Add a new RSS source and immediately test it."""
    import requests
    import feedparser

    name = payload.name.strip()
    url = payload.url.strip()
    if not name or not url:
        from fastapi import HTTPException
        raise HTTPException(400, "Name and URL are required")

    if db.query(Source).filter(Source.name == name).first():
        from fastapi import HTTPException
        raise HTTPException(400, f"Source '{name}' already exists")

    # Test the feed
    try:
        feed = feedparser.parse(url)
        if not feed.entries and feed.bozo:
            from fastapi import HTTPException
            raise HTTPException(400, f"Feed could not be parsed: {feed.bozo_exception}")
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(400, f"Feed unreachable: {e}")

    src = Source(name=name, url=url, method="rss", added_by="admin")
    db.add(src)
    db.commit()
    db.refresh(src)
    return {
        "id": src.id,
        "name": src.name,
        "url": src.url,
        "active": src.active,
        "entries_preview": len(feed.entries),
    }


@router.delete("/sources/list/{source_id}")
def delete_source(source_id: int, db: Session = Depends(get_db)):
    src = db.query(Source).filter(Source.id == source_id).first()
    if not src:
        from fastapi import HTTPException
        raise HTTPException(404, f"Source {source_id} not found")
    db.delete(src)
    db.commit()
    return {"deleted": source_id}


@router.post("/sources/test")
def test_source(payload: SourceCreate):
    """Test a URL without saving it."""
    import feedparser
    try:
        feed = feedparser.parse(payload.url.strip())
        return {
            "ok": True,
            "entries": len(feed.entries),
            "title": feed.feed.get("title", ""),
            "bozo": feed.bozo,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ============================================================
# Login verification
# ============================================================
class LoginPayload(BaseModel):
    username: str
    password: str


@router.post("/users/verify")
def verify_login(payload: LoginPayload):
    """Check credentials against the in-memory user store."""
    from ..users import find_by_credentials
    user = find_by_credentials(payload.username, payload.password)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(401, "Invalid username or password")
    return user


# ============================================================
# Manage Publications (admin MVP)
# ============================================================
from ..models import PublicationRow as PubRow
from datetime import datetime


class ManualPubCreate(BaseModel):
    title: str
    institution: str
    source_url: str
    published_date: str | None = None
    document_type: str | None = None
    abstract: str | None = None
    run_ai: bool = True


@router.get("/publications")
def list_admin_publications(
    filter: str = "all",
    source: str = "all",
    q: str = "",
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """List publications for admin with filters."""
    query = db.query(PubRow)

    if filter == "pending":
        query = query.filter(PubRow.ai_processed.is_(False))
    elif filter == "fallback":
        query = query.filter(PubRow.ai_engine == "rule-based")
    elif filter == "hidden":
        query = query.filter(PubRow.hidden.is_(True))
    elif filter == "visible":
        query = query.filter(PubRow.hidden.is_(False))

    if source != "all":
        query = query.filter(PubRow.institution == source)

    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(PubRow.title.ilike(like))

    rows = query.order_by(PubRow.collected_at.desc()).limit(limit).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "institution": r.institution,
            "source_url": r.source_url,
            "published_date": r.published_date.isoformat() if r.published_date else None,
            "ai_processed": r.ai_processed,
            "ai_engine": r.ai_engine,
            "hidden": bool(getattr(r, "hidden", False)),
            "manual": bool(getattr(r, "manual", False)),
            "ai_topics": r.ai_topics,
        }
        for r in rows
    ]


class BulkIds(BaseModel):
    ids: list[int]


@router.post("/publications/bulk-reset-ai")
def bulk_reset_ai(payload: BulkIds, db: Session = Depends(get_db)):
    """Reset selected pubs so the AI pipeline reprocesses them."""
    if not payload.ids:
        from fastapi import HTTPException
        raise HTTPException(400, "No IDs provided")

    count = (
        db.query(PubRow)
        .filter(PubRow.id.in_(payload.ids))
        .update({
            PubRow.ai_processed: False,
            PubRow.ai_summary: None,
            PubRow.ai_topics: None,
            PubRow.ai_relevance: None,
            PubRow.ai_engine: None,
            PubRow.ai_processed_at: None,
        }, synchronize_session=False)
    )
    db.commit()
    return {"reset": count}


@router.post("/publications/bulk-hide")
def bulk_hide(payload: BulkIds, db: Session = Depends(get_db)):
    count = (
        db.query(PubRow)
        .filter(PubRow.id.in_(payload.ids))
        .update({PubRow.hidden: True}, synchronize_session=False)
    )
    db.commit()
    return {"hidden": count}


@router.post("/publications/bulk-unhide")
def bulk_unhide(payload: BulkIds, db: Session = Depends(get_db)):
    count = (
        db.query(PubRow)
        .filter(PubRow.id.in_(payload.ids))
        .update({PubRow.hidden: False}, synchronize_session=False)
    )
    db.commit()
    return {"unhidden": count}


@router.post("/publications/manual")
def create_manual_publication(payload: ManualPubCreate, db: Session = Depends(get_db)):
    """Add a publication manually."""
    import hashlib
    from dateutil import parser as dateparser

    if not payload.title.strip() or not payload.source_url.strip():
        from fastapi import HTTPException
        raise HTTPException(400, "Title and source URL are required")

    fingerprint = hashlib.sha256(
        f"{payload.institution}|{payload.source_url}|{payload.title}".encode("utf-8")
    ).hexdigest()

    if db.query(PubRow).filter(PubRow.fingerprint == fingerprint).first():
        from fastapi import HTTPException
        raise HTTPException(400, "This publication already exists")

    pub_date = None
    if payload.published_date:
        try:
            pub_date = dateparser.parse(payload.published_date)
        except Exception:
            pass

    row = PubRow(
        title=payload.title.strip(),
        institution=payload.institution.strip() or "Manual",
        source_url=payload.source_url.strip(),
        published_date=pub_date,
        document_type=payload.document_type or "manual",
        abstract=payload.abstract,
        fingerprint=fingerprint,
        hidden=False,
        manual=True,
        ai_processed=not payload.run_ai,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "title": row.title, "run_ai": payload.run_ai}
