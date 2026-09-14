"""
alerts.py — Derive system alerts from real job + service state.

PURPOSE:
    Give analysts and admins a live list of things worth attention:
    job outcomes, service outages, backlogs, stale data.

RESPONSIBILITIES:
    generate_alerts() -> list of {id, level, title, message, timestamp, source}
    Levels: critical | high | medium | info | success

NOTES:
    - Alerts are computed on demand — not persisted.
    - Each alert has a stable id so the frontend can dismiss consistently
      within a session (dismissal is client-side only for now).
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


def generate_alerts() -> list[dict]:
    alerts: list[dict] = []
    now = datetime.now(timezone.utc)

    jobs = get_jobs()
    services = get_services()

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
                "message": f"Process is running (pid {svc['pid']}) but {svc['health_url']} did not return 200.",
                "timestamp": now.isoformat(),
                "source": "Service Monitor",
            })

    # ---- Collect job ----
    collect = jobs.get("collect", {})
    if collect["status"] == "error":
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
        if inserted > 0:
            alerts.append({
                "id": f"collect-inserted-{collect.get('finished_at')}",
                "level": "success",
                "title": f"{inserted} new publication{'s' if inserted != 1 else ''} collected",
                "message": f"Finished {_fmt(collect.get('finished_at'))}. "
                           f"{collect['result'].get('skipped', 0)} duplicates skipped.",
                "timestamp": collect.get("finished_at") or now.isoformat(),
                "source": "Collector",
            })
        else:
            alerts.append({
                "id": f"collect-empty-{collect.get('finished_at')}",
                "level": "info",
                "title": "Collection finished — no new items",
                "message": f"No new publications since last run ({_fmt(collect.get('finished_at'))}).",
                "timestamp": collect.get("finished_at") or now.isoformat(),
                "source": "Collector",
            })

    # ---- AI job ----
    ai = jobs.get("ai", {})
    if ai["status"] == "error":
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
                "message": f"Summaries, topics, and relevance completed at "
                           f"{_fmt(ai.get('finished_at'))}.",
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

    # ---- DB-based checks ----
    db = SessionLocal()
    try:
        total = db.query(PublicationRow).count()
        pending = db.query(PublicationRow).filter(PublicationRow.ai_processed.is_(False)).count()

        # Pending backlog
        if pending > 20:
            alerts.append({
                "id": f"backlog-{pending}",
                "level": "medium",
                "title": f"{pending} publications awaiting AI processing",
                "message": "Consider running the AI pipeline from the Admin Panel.",
                "timestamp": now.isoformat(),
                "source": "System",
            })

        # Stale data — no new pubs in 7 days
        cutoff = now - timedelta(days=7)
        recent = (
            db.query(PublicationRow)
            .filter(PublicationRow.collected_at >= cutoff)
            .count()
        )
        if total > 0 and recent == 0:
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

    # ---- Order: critical > high > medium > info > success ----
    order = {"critical": 0, "high": 1, "medium": 2, "info": 3, "success": 4}
    alerts.sort(key=lambda a: (order.get(a["level"], 99), a["timestamp"]), reverse=False)

    return alerts
