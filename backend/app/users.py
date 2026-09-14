"""
users.py — Simple in-memory user store for the prototype.

PURPOSE:
    Track user accounts (analyst / admin) for the admin panel.
    Passwords are stored in plain text — this is a PROTOTYPE ONLY
    and must not be used in production.

RESPONSIBILITIES:
    1. List all users.
    2. Create a new user.
    3. Delete a user (with protection against deleting the last admin).
    4. Reset user list to seed defaults.

NOTES:
    - In-memory only. Restarting the backend resets to seed users.
    - No password hashing. Documented as prototype limitation.
"""

from datetime import datetime, timezone
from threading import Lock


_LOCK = Lock()

SEED_USERS = [
    {
        "id": 1,
        "username": "analyst",
        "password": "analyst123",
        "role": "analyst",
        "full_name": "Default Analyst",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": 2,
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "full_name": "System Administrator",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

_USERS: list[dict] = [dict(u) for u in SEED_USERS]
_NEXT_ID = 3


def list_users() -> list[dict]:
    """Return all users (passwords excluded)."""
    with _LOCK:
        return [
            {k: v for k, v in u.items() if k != "password"}
            for u in _USERS
        ]


def create_user(username: str, password: str, role: str, full_name: str = "") -> dict:
    global _NEXT_ID
    with _LOCK:
        if any(u["username"] == username for u in _USERS):
            raise ValueError(f"User '{username}' already exists")
        if role not in ("analyst", "admin"):
            raise ValueError("Role must be 'analyst' or 'admin'")
        user = {
            "id": _NEXT_ID,
            "username": username,
            "password": password,
            "role": role,
            "full_name": full_name or username,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _USERS.append(user)
        _NEXT_ID += 1
        return {k: v for k, v in user.items() if k != "password"}


def delete_user(user_id: int) -> None:
    with _LOCK:
        target = next((u for u in _USERS if u["id"] == user_id), None)
        if not target:
            raise ValueError(f"User id {user_id} not found")
        # Protect: don't allow deleting the last admin
        if target["role"] == "admin":
            admins = [u for u in _USERS if u["role"] == "admin"]
            if len(admins) <= 1:
                raise ValueError("Cannot delete the last admin")
        _USERS.remove(target)
