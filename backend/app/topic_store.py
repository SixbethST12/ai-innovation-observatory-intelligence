"""
topic_store.py — DB-backed topic access with fallback to topics.py.
"""
from .database import SessionLocal
from .models import Topic
from .topics import TOPICS as SEED_TOPICS


def _seed_if_empty():
    """On first run, copy topics.py contents into the DB."""
    db = SessionLocal()
    try:
        if db.query(Topic).count() > 0:
            return
        for slug, meta in SEED_TOPICS.items():
            db.add(Topic(
                slug=slug,
                label=meta["label"],
                keywords=", ".join(meta["keywords"]),
                active=True,
                is_builtin=True,
            ))
        db.commit()
        print(f"[topic_store] seeded {len(SEED_TOPICS)} topics")
    finally:
        db.close()


def list_topics(active_only: bool = True) -> list[dict]:
    _seed_if_empty()
    db = SessionLocal()
    try:
        q = db.query(Topic)
        if active_only:
            q = q.filter(Topic.active.is_(True))
        rows = q.order_by(Topic.id).all()
        return [
            {"id": r.id, "slug": r.slug, "label": r.label,
             "keywords": [k.strip() for k in (r.keywords or "").split(",") if k.strip()],
             "active": r.active, "is_builtin": r.is_builtin}
            for r in rows
        ]
    finally:
        db.close()


def get_slugs(active_only: bool = True) -> list[str]:
    return [t["slug"] for t in list_topics(active_only=active_only)]


def get_labels() -> dict[str, str]:
    return {t["slug"]: t["label"] for t in list_topics()}


def add_topic(slug: str, label: str, keywords: list[str]) -> dict:
    _seed_if_empty()
    db = SessionLocal()
    try:
        if db.query(Topic).filter(Topic.slug == slug).first():
            raise ValueError(f"Topic '{slug}' already exists")
        row = Topic(slug=slug, label=label,
                    keywords=", ".join(keywords),
                    active=True, is_builtin=False)
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"id": row.id, "slug": row.slug, "label": row.label}
    finally:
        db.close()


def delete_topic(slug: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(Topic).filter(Topic.slug == slug).first()
        if not row:
            raise ValueError(f"Topic '{slug}' not found")
        if row.is_builtin:
            raise ValueError("Cannot delete built-in topics")
        db.delete(row)
        db.commit()
    finally:
        db.close()
