"""
database.py — SQLAlchemy engine, session, and declarative base.

PURPOSE:
    Provide the database connection and session lifecycle used across
    the backend, plus the shared `Base` for all ORM models.

RESPONSIBILITIES:
    1. Create the SQLAlchemy engine from config.DATABASE_URL.
    2. Provide SessionLocal (per-request session factory).
    3. Provide a `get_db()` dependency for FastAPI.
    4. Provide `init_db()` to create tables.

USED BY:
    - app/models.py          (inherits Base)
    - app/routers/*          (Depends(get_db))
    - storage scripts        (SessionLocal directly)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL


# SQLite needs a special flag for multithreaded FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a session, closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables defined on Base subclasses."""
    from . import models  # noqa: F401  (ensures models are registered)
    Base.metadata.create_all(bind=engine)
