"""
services.py — Local service control (start/stop/status/logs).

PURPOSE:
    Let the admin panel check status and restart the three local
    services: Ollama, FastAPI backend, Vite frontend.

RESPONSIBILITIES:
    1. get_status() — process + HTTP health for each service.
    2. restart(name) — stop + start a service in the background.
    3. get_logs(name, lines) — return last N lines of its log file.

NOTES:
    - Runs local `pkill`, `nohup`, `ps` — assumes Linux (Codespaces / VPS).
    - Restarting the backend itself uses a detached shell so the new
      process outlives the current request handler.
    - No shell injection: service names are from a fixed whitelist.
"""

import os
import subprocess
import time
from pathlib import Path

import requests


REPO = Path("/workspaces/ai-innovation-observatory-intelligence")

SERVICES = {
    "ollama": {
        "pgrep": "ollama serve",
        "health": "http://localhost:11434/api/tags",
        "log": "/tmp/ollama.log",
        "start": f"nohup ollama serve > /tmp/ollama.log 2>&1 &",
        "cwd": str(REPO),
    },
    "backend": {
        "pgrep": "uvicorn app.main:app",
        "health": "http://localhost:8000/health",
        "log": "/tmp/api.log",
        "start": f"cd {REPO}/backend && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &",
        "cwd": f"{REPO}/backend",
    },
    "frontend": {
        "pgrep": "vite --host",
        "health": "http://localhost:5173/",
        "log": "/tmp/vite.log",
        "start": f"cd {REPO}/frontend && nohup npm run dev -- --host 0.0.0.0 --port 5173 --strictPort > /tmp/vite.log 2>&1 &",
        "cwd": f"{REPO}/frontend",
    },
}


def _is_running(pattern: str) -> tuple[bool, int | None]:
    try:
        out = subprocess.check_output(["pgrep", "-f", pattern], text=True).strip()
        if not out:
            return False, None
        return True, int(out.split("\n")[0])
    except subprocess.CalledProcessError:
        return False, None


def _http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        r = requests.get(url, timeout=timeout)
        return r.status_code == 200
    except Exception:
        return False


def get_status() -> list[dict]:
    out = []
    for name, cfg in SERVICES.items():
        running, pid = _is_running(cfg["pgrep"])
        healthy = _http_ok(cfg["health"]) if running else False
        out.append({
            "name": name,
            "running": running,
            "pid": pid,
            "healthy": healthy,
            "health_url": cfg["health"],
        })
    return out


def restart(name: str) -> dict:
    if name not in SERVICES:
        raise ValueError(f"Unknown service: {name}")
    cfg = SERVICES[name]

    # Kill existing
    subprocess.run(["pkill", "-f", cfg["pgrep"]], check=False)
    time.sleep(1)

    # Detach restart so it survives this HTTP request (esp. backend)
    subprocess.Popen(
        ["bash", "-c", cfg["start"]],
        cwd=cfg["cwd"],
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Give it a moment
    time.sleep(3)
    running, pid = _is_running(cfg["pgrep"])
    return {"service": name, "restarted": True, "running": running, "pid": pid}


def get_logs(name: str, lines: int = 60) -> dict:
    if name not in SERVICES:
        raise ValueError(f"Unknown service: {name}")
    log_path = SERVICES[name]["log"]
    if not os.path.exists(log_path):
        return {"service": name, "lines": [], "note": "log file not found"}
    try:
        with open(log_path, "r", errors="replace") as f:
            content = f.readlines()
        return {"service": name, "lines": [l.rstrip("\n") for l in content[-lines:]]}
    except Exception as e:
        return {"service": name, "lines": [], "error": str(e)}
