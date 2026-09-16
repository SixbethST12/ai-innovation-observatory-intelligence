"""
services.py — Local service control (status / restart / logs).
"""

import os
from pathlib import Path
import requests

IN_DOCKER = Path("/.dockerenv").exists()

SERVICES = {
    "ollama": {
        "health": "http://host.docker.internal:11434/api/tags" if IN_DOCKER else "http://localhost:11434/api/tags",
        "log": "/tmp/ollama.log",
    },
    "backend": {
        "health": "http://localhost:8000/health",
        "log": "/tmp/api.log",
    },
    "frontend": {
        "health": "http://localhost:5173/",
        "log": "/tmp/vite.log",
    },
}


def _http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        r = requests.get(url, timeout=timeout)
        return r.status_code == 200
    except Exception:
        return False


def get_status() -> list[dict]:
    out = []
    for name, cfg in SERVICES.items():
        if IN_DOCKER and name == "frontend":
            healthy = True
        else:
            healthy = _http_ok(cfg["health"])
        out.append({
            "name": name,
            "running": healthy,
            "pid": None,
            "healthy": healthy,
            "health_url": cfg["health"],
        })
    return out


def restart(name: str) -> dict:
    if name not in SERVICES:
        raise ValueError(f"Unknown service: {name}")
    return {
        "service": name,
        "restarted": False,
        "note": "Restart disabled inside Docker. Use docker compose restart on the host.",
    }


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
