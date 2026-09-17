"""
storage.py — Persist collected publications into the database.

PURPOSE:
    Bridge between the collection layer (Publication dataclasses) and
    the data layer (PublicationRow ORM). Handles insert + duplicate
    detection at the DB level, and triggers rule matching on new rows.

RESPONSIBILITIES:
    1. `save_publications(pubs)` — insert new rows, skip existing ones.
    2. Track inserted IDs and run alert-rule matching on them.
    3. Return counts (inserted, skipped, total) so the caller can report.

USED BY:
    - CLI storage script
    - app/jobs/manager.py (via _run_collection)
"""

from sqlalchemy.exc import IntegrityError

from .database import SessionLocal
from .models import PublicationRow
from .collectors.base import Publication


def save_publications(pubs: list[Publication]) -> dict:
    """
    Insert publications into the DB, skipping duplicates.

    Returns:
        {"inserted": int, "skipped": int, "total": int, "matched": int}
    """
    session = SessionLocal()
    inserted = 0
    skipped = 0
    inserted_ids: list[int] = []

    try:
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
            session.flush()      # assign row.id
            inserted_ids.append(row.id)
            existing.add(fp)
            inserted += 1

        session.commit()
    except IntegrityError as e:
        session.rollback()
        print(f"[storage] IntegrityError: {e}")
        raise
    finally:
        session.close()

    # Run alert-rule matching on the newly inserted rows
    matched = 0
    if inserted_ids:
        try:
            from .rule_matcher import match_new_publications
            matched = match_new_publications(inserted_ids)
            if matched:
                print(f"[storage] rule matches created: {matched}")
        except Exception as e:
            print(f"[storage] rule matching failed: {e}")

    return {
        "inserted": inserted,
        "skipped": skipped,
        "total": len(pubs),
        "matched": matched,
    }
