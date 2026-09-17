"""
cache.py — Simple in-memory TTL cache for expensive endpoints.
"""

import time
from threading import Lock


_CACHE: dict = {}
_LOCK = Lock()


def get(key: str, ttl_seconds: int):
    with _LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            _CACHE.pop(key, None)
            return None
        return value


def set(key: str, value, ttl_seconds: int) -> None:
    with _LOCK:
        _CACHE[key] = (value, time.time() + ttl_seconds)


def clear(key: str | None = None) -> None:
    with _LOCK:
        if key:
            _CACHE.pop(key, None)
        else:
            _CACHE.clear()
