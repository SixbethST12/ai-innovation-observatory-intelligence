"""
activity.py — Recent system activity feed.

PURPOSE:
    Combine events from jobs, rule matches, and services into a
    chronological feed for the admin dashboard.

RESPONSIBILITIES:
    1. build_activity(limit) — return recent events sorted by time.
"""

from datetime import datetime, timezone

from .database import SessionLocal
from .models import PublicationRow, RuleMatch, AlertRule
from .jobs.manager import get_status as get_jobs


def build_activity(limit: int = 15) -> list[dict]:
    events: list[dict] = []
    jobs = get_jobs()

    # Job events
    for name, job in jobs.items():
        if job.get("finished_at"):
            events.append({
                "type": "job",
                "level": "success" if job["status"] == "done" else "high",
                "title": f"{name.capitalize()} job {job['status']}",
                "message": _job_message(name, job),
                "timestamp": job["finished_at"],
            })
        if job.get("started_at") and job["status"] == "running":
            events.append({
                "type": "job",
                "level": "info",
                "title": f"{name.capitalize()} job started",
                "message": "Running…",
                "timestamp": job["started_at"],
            })

    db = SessionLocal()
    try:
        # Rule matches (recent)
        matches = (
            db.query(RuleMatch, AlertRule, PublicationRow)
            .join(AlertRule, AlertRule.id == RuleMatch.rule_id)
            .join(PublicationRow, PublicationRow.id == RuleMatch.publication_id)
            .order_by(RuleMatch.matched_at.desc())
            .limit(limit)
            .all()
        )
        for m, r, p in matches:
            events.append({
                "type": "rule_match",
                "level": "info",
                "title": f'Rule "{r.keyword}" matched',
                "message": f"{p.institution}: {p.title[:80]}",
                "timestamp": m.matched_at.isoformat() if m.matched_at else None,
            })

        # Recent publications
        pubs = (
            db.query(PublicationRow)
            .order_by(PublicationRow.collected_at.desc())
            .limit(5)
            .all()
        )
        for p in pubs:
            events.append({
                "type": "publication",
                "level": "info",
                "title": f"New publication: {p.institution}",
                "message": p.title[:90],
                "timestamp": p.collected_at.isoformat() if p.collected_at else None,
            })
    finally:
        db.close()

    # Sort by timestamp desc, take limit
    events = [e for e in events if e.get("timestamp")]
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return events[:limit]


def _job_message(name: str, job: dict) -> str:
    result = job.get("result") or {}
    if name == "collect":
        return f"{result.get('inserted', 0)} inserted, {result.get('skipped', 0)} skipped"
    if name == "ai":
        return f"{result.get('processed', 0)} processed, {result.get('failed', 0)} failed"
    return ""
