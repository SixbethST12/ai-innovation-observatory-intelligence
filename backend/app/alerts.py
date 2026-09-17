"""
alerts.py — Live alerts derived from system + job + corpus state.

RESPONSIBILITIES:
    generate_alerts() -> list of alert objects.

ALERT SHAPE:
    {
        id: str (stable — same event → same id),
        level: "critical" | "high" | "medium" | "info" | "success",
        category: "system" | "job" | "publication" | "trend" | "data",
        title: str,
        message: str,
        timestamp: ISO string,
        source: str,
        progress?: { done, total, percent, running }
    }

USED BY:
    - app/routers/admin.py  (/admin/alerts)
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
    db = SessionLocal()
    try:
        total = db.query(PublicationRow).count()
        done = db.query(PublicationRow).filter(PublicationRow.ai_processed.is_(True)).count()
        return {"total": total, "done": done, "pending": total - done}
    finally:
        db.close()


def _recent_pubs(hours: int = 6) -> list:
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return (
            db.query(PublicationRow)
            .filter(PublicationRow.collected_at >= cutoff)
            .order_by(PublicationRow.collected_at.desc())
            .all()
        )
    finally:
        db.close()


def generate_alerts() -> list[dict]:
    alerts: list[dict] = []
    now = datetime.now(timezone.utc)

    jobs = get_jobs()
    services = get_services()
    progress = _progress()

    # ============================================================
    # 1. SERVICE HEALTH (category: system)
    # ============================================================
    for svc in services:
        if not svc["running"]:
            alerts.append({
                "id": f"svc-down-{svc['name']}",
                "level": "critical",
                "category": "system",
                "title": f"{svc['name'].capitalize()} is not running",
                "message": f"No process found for {svc['name']}. Check the Service Control page.",
                "timestamp": now.isoformat(),
                "source": "Service Monitor",
            })
        elif not svc["healthy"]:
            alerts.append({
                "id": f"svc-unhealthy-{svc['name']}",
                "level": "high",
                "category": "system",
                "title": f"{svc['name'].capitalize()} is unresponsive",
                "message": f"Process running (pid {svc['pid']}) but health check failed.",
                "timestamp": now.isoformat(),
                "source": "Service Monitor",
            })

    # ============================================================
    # 2. JOB STATES (category: job)
    # ============================================================
    collect = jobs.get("collect", {})
    if collect["status"] == "running":
        alerts.append({
            "id": "job-collect-running",
            "level": "info",
            "category": "job",
            "title": "Data collection in progress",
            "message": f"Started at {_fmt(collect.get('started_at'))}. Fetching from BIS, IMF, World Bank, CBK.",
            "timestamp": collect.get("started_at") or now.isoformat(),
            "source": "Collector",
            "progress": {"running": True},
        })
    elif collect["status"] == "error":
        alerts.append({
            "id": "job-collect-error",
            "level": "high",
            "category": "job",
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
            "category": "job",
            "title": (
                f"{inserted} new publication{'s' if inserted != 1 else ''} collected"
                if inserted else "Collection finished — no new items"
            ),
            "message": f"{collect['result'].get('skipped', 0)} duplicates skipped. Finished {_fmt(collect.get('finished_at'))}.",
            "timestamp": collect.get("finished_at") or now.isoformat(),
            "source": "Collector",
        })

    ai = jobs.get("ai", {})
    if ai["status"] == "running":
        pct = int((progress["done"] / progress["total"]) * 100) if progress["total"] else 0
        alerts.append({
            "id": "job-ai-running",
            "level": "info",
            "category": "job",
            "title": f"AI pipeline running — {progress['done']}/{progress['total']} processed",
            "message": f"{progress['pending']} remaining. Started {_fmt(ai.get('started_at'))}.",
            "timestamp": ai.get("started_at") or now.isoformat(),
            "source": "AI Pipeline",
            "progress": {
                "done": progress["done"], "total": progress["total"],
                "percent": pct, "running": True,
            },
        })
    elif ai["status"] == "error":
        alerts.append({
            "id": "job-ai-error",
            "level": "high",
            "category": "job",
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
                "category": "job",
                "title": f"AI processed {processed} publication{'s' if processed != 1 else ''}",
                "message": f"Summaries, topics, and relevance completed at {_fmt(ai.get('finished_at'))}.",
                "timestamp": ai.get("finished_at") or now.isoformat(),
                "source": "AI Pipeline",
            })
        if failed > 0:
            alerts.append({
                "id": f"ai-failed-{ai.get('finished_at')}",
                "level": "medium",
                "category": "job",
                "title": f"{failed} publication{'s' if failed != 1 else ''} failed AI processing",
                "message": "Check the backend logs for details.",
                "timestamp": ai.get("finished_at") or now.isoformat(),
                "source": "AI Pipeline",
            })

    # ============================================================
    # 3. PUBLICATION ACTIVITY (category: publication)
    # ============================================================
    recent = _recent_pubs(hours=6)
    for p in recent[:5]:
        topics = p.ai_topics or ""
        topic_count = len([t for t in topics.split(",") if t.strip()])
        level = "info"
        if topic_count >= 3:
            level = "medium"
        alerts.append({
            "id": f"pub-{p.id}",
            "level": level,
            "category": "publication",
            "title": f"New from {p.institution}: {p.title[:60]}{'…' if len(p.title) > 60 else ''}",
            "message": (
                f"Collected {_fmt(p.collected_at.isoformat() if p.collected_at else None)}. "
                f"Topics: {topics.replace(',', ', ') if topics else 'not yet classified'}."
            ),
            "timestamp": (p.collected_at.isoformat() if p.collected_at else now.isoformat()),
            "source": p.institution,
        })

    # ============================================================
    # 4. DATA QUALITY / BACKLOG (category: data)
    # ============================================================
    if progress["pending"] > 20:
        pct = int((progress["done"] / progress["total"]) * 100) if progress["total"] else 0
        alerts.append({
            "id": f"backlog-{progress['pending']}",
            "level": "medium",
            "category": "data",
            "title": f"{progress['pending']} publications awaiting AI processing",
            "message": "Consider running the AI pipeline from the Admin Panel.",
            "timestamp": now.isoformat(),
            "source": "System",
            "progress": {
                "done": progress["done"], "total": progress["total"],
                "percent": pct, "running": False,
            },
        })

    db = SessionLocal()
    try:
        cutoff = now - timedelta(days=7)
        recent_count = (
            db.query(PublicationRow)
            .filter(PublicationRow.collected_at >= cutoff)
            .count()
        )
        if progress["total"] > 0 and recent_count == 0:
            alerts.append({
                "id": "stale-7d",
                "level": "medium",
                "category": "data",
                "title": "No new publications in the last 7 days",
                "message": "Run a collection from the Admin Panel to refresh.",
                "timestamp": now.isoformat(),
                "source": "System",
            })

        # Fallback-engine count as a data-quality signal
        fallback = (
            db.query(PublicationRow)
            .filter(PublicationRow.ai_engine == "rule-based")
            .count()
        )
        if fallback > 0:
            alerts.append({
                "id": f"fallback-{fallback}",
                "level": "info",
                "category": "data",
                "title": f"{fallback} publication{'s' if fallback != 1 else ''} processed with rule-based fallback",
                "message": "Ollama may have been unavailable. Re-run the AI pipeline to upgrade them.",
                "timestamp": now.isoformat(),
                "source": "AI Pipeline",
            })
    finally:
        db.close()

    # ============================================================
    # 5. TREND SIGNALS (category: trend)
    # ============================================================
    try:
        from .ai.trends import emerging_topics
        top = emerging_topics(months_back=3, top_n=3)
        for e in top:
            if e["score"] >= 20:
                alerts.append({
                    "id": f"trend-{e['topic']}-{e['score']}",
                    "level": "medium",
                    "category": "trend",
                    "title": f"Surge detected: {e['topic'].replace('_', ' ')}",
                    "message": (
                        f"{e['recent']} mentions this quarter vs {e['prior']} prior "
                        f"(+{e['score']})."
                    ),
                    "timestamp": now.isoformat(),
                    "source": "Trend Engine",
                })
    except Exception:
        pass

    # ============================================================
    # ORDER: critical > high > medium > info > success, then newest first
    # ============================================================
    order = {"critical": 0, "high": 1, "medium": 2, "info": 3, "success": 4}
    alerts.sort(key=lambda a: (order.get(a["level"], 99), a["timestamp"]), reverse=False)
    return alerts
