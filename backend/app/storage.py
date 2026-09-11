"""
storage.py — Persist collected publications into the database.

PURPOSE:
    Bridge between the collection layer (Publication dataclasses) and
    the data layer (PublicationRow ORM). Handles insert + duplicate
    detection at the DB level.

RESPONSIBILITIES:
    1. `save_publications(pubs)` — insert new rows, skip existing ones.
    2. Return counts (inserted, skipped) so the caller can report.
    3. Rely on `fingerprint` UNIQUE constraint for correctness even if
       the Python-level check is bypassed.

USED BY:
    - CLI storage script
    - Future: scheduler job after each collection run

NOTES:
    - Uses `SessionLocal` directly (not the FastAPI dependency).
    - Does NOT run AI enrichment — that is Layer 4's job.
"""

from sqlalchemy.exc import IntegrityError

from .database import SessionLocal
from .models import PublicationRow
from .collectors.base import Publication


def save_publications(pubs: list[Publication]) -> dict:
    """
    Insert publications into the DB, skipping duplicates.

    Returns:
        {"inserted": int, "skipped": int, "total": int}
    """
    session = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        # Pre-fetch existing fingerprints for a fast Python-side skip
        existing = {fp for (fp,) in session.query(PublicationRow.fingerprint).all()}

        for pub in pubs:
            fp = pub.fingerprint()
            if fp in existing:
                skipped += 1
                continue

            row = PublicationRow(
                title=pub.title,
                institution=pub.institution,
                source_url=pub.source_url,
                published_date=pub.published_date,
                document_type=pub.document_type,
                abstract=pub.abstract,
                raw_content=pub.raw_content,
                fingerprint=fp,
            )
            session.add(row)
            existing.add(fp)
            inserted += 1

        session.commit()
    except IntegrityError as e:
        session.rollback()
        print(f"[storage] IntegrityError: {e}")
        raise
    finally:
        session.close()

    return {"inserted": inserted, "skipped": skipped, "total": len(pubs)}
