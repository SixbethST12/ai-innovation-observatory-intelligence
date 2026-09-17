"""
alerts.py — Derive system alerts from real job + service state.

PURPOSE:
    Give analysts and admins a live list of things worth attention:
    running job progress, job outcomes, service outages, backlogs.

RESPONSIBILITIES:
    generate_alerts() -> list of {id, level, title, message, timestamp, source, progress?}

LEVELS: critical | high | medium | info | success
"""

from datetime import datetime, timezone, timedelta

from .database import SessionLocal
from .models import PublicationRow
from .jobs.manager import get_status as get_jobs
from .services import get_status as get_services


def _fmt(dt: str | None) -> str:
    if not dt:
        return "—"
    try:
        return datetime.fromisoformat(dt).strftime("%d %b %Y, %H:%M")
    except Exception:
        return dt


def _progress() -> dict:
    """Current AI processing progress from the DB."""
    db = SessionLocal()
    try:
        total = db.query(PublicationRow).count()
        done = db.query(PublicationRow).filter(PublicationRow.ai_processed.is_(True)).count()
        pending = total - done
        return {"total": total, "done": done, "pending": pending}
    finally:
        db.close()


def generate_alerts() -> list[dict]:
    alerts: list[dict] = []
    now = datetime.now(timezone.utc)

    jobs = get_jobs()
    services = get_services()
    progress = _progress()

    # ---- Service health ----
    for svc in services:
        if not svc["running"]:
            alerts.append({
                "id": f"svc-down-{svc['name']}",
                "level": "critical",
                "title": f"{svc['name'].capitalize()} is not running",
                "message": f"No process found for {svc['name']}. Check the Service Control page.",
                "timestamp": now.isoformat(),
                "source": "Service Monitor",
            })
        elif not svc["healthy"]:
            alerts.append({
                "id": f"svc-unhealthy-{svc['name']}",
                "level": "high",
                "title": f"{svc['name'].capitalize()} is unresponsive",
                "message": f"Process is running (pid {svc['pid']}) but health check failed.",
                "timestamp": now.isoformat(),
                "source": "Service Monitor",
            })

    # ---- Collect job ----
    collect = jobs.get("collect", {})
    if collect["status"] == "running":
        alerts.append({
            "id": "job-collect-running",
            "level": "info",
            "title": "Data collection in progress",
            "message": f"Started at {_fmt(collect.get('started_at'))}. Fetching publications from BIS, IMF, World Bank, CBK.",
            "timestamp": collect.get("started_at") or now.isoformat(),
            "source": "Collector",
            "progress": {"running": True},
        })
    elif collect["status"] == "error":
        alerts.append({
            "id": "job-collect-error",
            "level": "high",
            "title": "Data collection failed",
            "message": collect.get("error") or "Collector raised an exception.",
            "timestamp": collect.get("finished_at") or now.isoformat(),
            "source": "Collector",
        })
    elif collect["status"] == "done" and collect.get("result"):
        inserted = collect["result"].get("inserted", 0)
        alerts.append({
            "id": f"collect-result-{collect.get('finished_at')}",
            "level": "success" if inserted > 0 else "info",
            "title": f"{inserted} new publication{'s' if inserted != 1 else ''} collected" if inserted else "Collection finished — no new items",
            "message": f"{collect['result'].get('skipped', 0)} duplicates skipped. Finished {_fmt(collect.get('finished_at'))}.",
            "timestamp": collect.get("finished_at") or now.isoformat(),
            "source": "Collector",
        })

    # ---- AI job ----
    ai = jobs.get("ai", {})
    if ai["status"] == "running":
        pct = int((progress["done"] / progress["total"]) * 100) if progress["total"] else 0
        alerts.append({
            "id": "job-ai-running",
            "level": "info",
            "title": f"AI pipeline running — {progress['done']}/{progress['total']} processed",
            "message": f"{progress['pending']} remaining. Started {_fmt(ai.get('started_at'))}.",
            "timestamp": ai.get("started_at") or now.isoformat(),
            "source": "AI Pipeline",
            "progress": {"done": progress["done"], "total": progress["total"], "percent": pct, "running": True},
        })
    elif ai["status"] == "error":
        alerts.append({
            "id": "job-ai-error",
            "level": "high",
            "title": "AI pipeline failed",
            "message": ai.get("error") or "Pipeline raised an exception.",
            "timestamp": ai.get("finished_at") or now.isoformat(),
            "source": "AI Pipeline",
        })
    elif ai["status"] == "done" and ai.get("result"):
        processed = ai["result"].get("processed", 0)
        failed = ai["result"].get("failed", 0)
        if processed > 0:
            alerts.append({
                "id": f"ai-processed-{ai.get('finished_at')}",
                "level": "success",
                "title": f"AI processed {processed} publication{'s' if processed != 1 else ''}",
                "message": f"Summaries, topics, and relevance completed at {_fmt(ai.get('finished_at'))}.",
                "timestamp": ai.get("finished_at") or now.isoformat(),
                "source": "AI Pipeline",
            })
        if failed > 0:
            alerts.append({
                "id": f"ai-failed-{ai.get('finished_at')}",
                "level": "medium",
                "title": f"{failed} publication{'s' if failed != 1 else ''} failed AI processing",
                "message": "Check the backend logs for details.",
                "timestamp": ai.get("finished_at") or now.isoformat(),
                "source": "AI Pipeline",
            })

    # ---- Pending backlog ----
    if progress["pending"] > 20:
        alerts.append({
            "id": f"backlog-{progress['pending']}",
            "level": "medium",
            "title": f"{progress['pending']} publications awaiting AI processing",
            "message": "Consider running the AI pipeline from the Admin Panel.",
            "timestamp": now.isoformat(),
            "source": "System",
            "progress": {"done": progress["done"], "total": progress["total"], "percent": int((progress["done"]/progress["total"])*100) if progress["total"] else 0, "running": False},
        })

    # ---- Stale data ----
    db = SessionLocal()
    try:
        cutoff = now - timedelta(days=7)
        recent = db.query(PublicationRow).filter(PublicationRow.collected_at >= cutoff).count()
        if progress["total"] > 0 and recent == 0:
            alerts.append({
                "id": "stale-7d",
                "level": "medium",
                "title": "No new publications in the last 7 days",
                "message": "Run a collection from the Admin Panel to refresh.",
                "timestamp": now.isoformat(),
                "source": "System",
            })
    finally:
        db.close()

    # ---- Order ----
    order = {"critical": 0, "high": 1, "medium": 2, "info": 3, "success": 4}
    alerts.sort(key=lambda a: order.get(a["level"], 99))
    return alerts
