"""
models.py — SQLAlchemy ORM models for the Observatory.

PURPOSE:
    Define the persistent shape of the data: publications, their AI
    outputs, and topic classifications.

RESPONSIBILITIES:
    1. `PublicationRow` — one row per collected publication.
    2. Future: classification rows, trend snapshots.

NOTES:
    - `fingerprint` is UNIQUE — this is what enforces duplicate detection
      at the database level (not just in Python).
    - AI fields are nullable because a publication is stored first, then
      enriched by the AI layer in a second pass.
    - `source_url` is required and never overwritten — enforces traceability.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func

from .database import Base


class PublicationRow(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Source metadata
    title = Column(String, nullable=False)
    institution = Column(String, nullable=False, index=True)
    source_url = Column(String, nullable=False)
    published_date = Column(DateTime, nullable=True, index=True)
    document_type = Column(String, nullable=True)
    abstract = Column(Text, nullable=True)
    raw_content = Column(Text, nullable=True)

    # Duplicate detection
    fingerprint = Column(String, nullable=False, unique=True, index=True)

    # AI-generated fields (nullable until Layer 4 runs)
    ai_summary = Column(Text, nullable=True)
    ai_topics = Column(String, nullable=True)          # comma-separated slugs
    ai_relevance = Column(Text, nullable=True)         # relevance-to-BOT note
    ai_processed = Column(Boolean, default=False, nullable=False)
    ai_processed_at = Column(DateTime, nullable=True)
    ai_engine = Column(String, nullable=True)          # "ollama" | "rule-based"

    # Admin controls
    hidden = Column(Boolean, default=False, nullable=False, index=True)
    manual = Column(Boolean, default=False, nullable=False)

    # Timestamps
    collected_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<PublicationRow id={self.id} inst={self.institution} title={self.title[:40]!r}>"


class AlertRule(Base):
    """User-defined rule — 'notify me when a new pub matches this'."""
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String, nullable=False)
    source = Column(String, nullable=True)      # "all" or institution name
    topic = Column(String, nullable=True)       # "all" or topic slug
    priority = Column(String, nullable=False, default="medium")  # high/medium/low
    created_by = Column(String, nullable=True)  # username
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    active = Column(Boolean, default=True, nullable=False)


class RuleMatch(Base):
    """A record that a rule matched a publication."""
    __tablename__ = "rule_matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, nullable=False, index=True)
    publication_id = Column(Integer, nullable=False, index=True)
    matched_at = Column(DateTime, server_default=func.now(), nullable=False)


class Source(Base):
    """User-added RSS source (extends the built-in 4)."""
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    url = Column(String, nullable=False)
    method = Column(String, nullable=False, default="rss")   # rss only for now
    active = Column(Boolean, default=True, nullable=False)
    builtin = Column(Boolean, default=False, nullable=False)
    added_by = Column(String, nullable=True)
    added_at = Column(DateTime, server_default=func.now(), nullable=False)
