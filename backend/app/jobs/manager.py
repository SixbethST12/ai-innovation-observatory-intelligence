"""
manager.py — Simple in-memory job tracker for admin-triggered background tasks.

PURPOSE:
    Track collection and AI pipeline jobs triggered from the admin panel.
    Keeps status, timestamps, and last result in memory.

RESPONSIBILITIES:
    1. start_job(name, fn) — run fn in a thread, record status.
    2. get_status() — return current state of all jobs.
    3. Prevent duplicate runs of the same job.

NOTES:
    - In-memory only. Restarting the backend resets job history.
    - Not production-grade (no queue, no persistence, no cancellation).
    - Good enough for a prototype that runs a handful of jobs per session.
"""

import threading
from datetime import datetime, timezone
from typing import Callable, Any


JOBS: dict[str, dict] = {
    "collect":   {"status": "idle", "started_at": None, "finished_at": None, "result": None, "error": None},
    "ai":        {"status": "idle", "started_at": None, "finished_at": None, "result": None, "error": None},
}

_LOCK = threading.Lock()


def _run(name: str, fn: Callable[[], Any]) -> None:
    try:
        result = fn()
        with _LOCK:
            JOBS[name]["status"] = "done"
            JOBS[name]["result"] = result
            JOBS[name]["finished_at"] = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        with _LOCK:
            JOBS[name]["status"] = "error"
            JOBS[name]["error"] = str(e)
            JOBS[name]["finished_at"] = datetime.now(timezone.utc).isoformat()


def start_job(name: str, fn: Callable[[], Any]) -> dict:
    """Start a job if not already running. Returns the current job state."""
    if name not in JOBS:
        raise ValueError(f"Unknown job: {name}")
    with _LOCK:
        if JOBS[name]["status"] == "running":
            return {"started": False, **JOBS[name]}
        JOBS[name] = {
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": None,
            "result": None,
            "error": None,
        }
    threading.Thread(target=_run, args=(name, fn), daemon=True).start()
    return {"started": True, **JOBS[name]}


def get_status() -> dict:
    return {name: dict(state) for name, state in JOBS.items()}
