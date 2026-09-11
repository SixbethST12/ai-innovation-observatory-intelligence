"""
pipeline.py — Run all AI steps on unprocessed publications.

PURPOSE:
    Orchestrate the AI layer: for every publication with ai_processed=False,
    run summarize → classify → relevance, then mark it processed.

RESPONSIBILITIES:
    1. Select unprocessed rows from the DB.
    2. For each: build input text, call the three AI modules, store results.
    3. Record which engine produced the output (ai_engine).
    4. Update ai_processed and ai_processed_at.
    5. Report progress and totals.

USED BY:
    - CLI: `python -m app.ai.pipeline`
    - Future: FastAPI background task or scheduler.

NOTES:
    - Idempotent: only touches rows where ai_processed is False.
    - Failure-isolated: if one row fails, log and continue.
    - Runs on CPU; expect ~15-60s per publication with qwen2.5:3b.
"""

from datetime import datetime

from ..database import SessionLocal
from ..models import PublicationRow
from .summarize import summarize
from .classify import classify
from .relevance import relevance


def _input_text(pub: PublicationRow) -> str:
    """Pick the best available text for the AI modules."""
    if pub.abstract and pub.abstract.strip():
        return pub.abstract
    if pub.raw_content and pub.raw_content.strip():
        return pub.raw_content
    return ""


def process_pending(limit: int | None = None) -> dict:
    """
    Process unprocessed publications.

    Args:
        limit: optional cap on how many to process this run.

    Returns:
        {"processed": int, "failed": int, "remaining": int}
    """
    session = SessionLocal()
    processed = 0
    failed = 0

    try:
        q = session.query(PublicationRow).filter(PublicationRow.ai_processed.is_(False))
        if limit:
            q = q.limit(limit)
        pending = q.all()

        total_pending = len(pending)
        print(f"[pipeline] {total_pending} publications to process")

        for i, pub in enumerate(pending, start=1):
            try:
                text = _input_text(pub)
                print(f"[pipeline] ({i}/{total_pending}) {pub.institution}: {pub.title[:60]}")

                summary, sum_engine = summarize(pub.title, text)
                topics, cls_engine = classify(pub.title, text)
                rel, rel_engine = relevance(pub.title, text)

                # Engine priority: ollama > rule-based
                engines = {sum_engine, cls_engine, rel_engine}
                engine = "ollama" if "ollama" in engines else "rule-based"

                pub.ai_summary = summary
                pub.ai_topics = ",".join(topics) if topics else None
                pub.ai_relevance = rel
                pub.ai_engine = engine
                pub.ai_processed = True
                pub.ai_processed_at = datetime.now(datetime.UTC)
                session.commit()
                processed += 1

            except Exception as e:
                session.rollback()
                print(f"[pipeline] FAILED on id={pub.id}: {e}")
                failed += 1

        remaining = (
            session.query(PublicationRow)
            .filter(PublicationRow.ai_processed.is_(False))
            .count()
        )
    finally:
        session.close()

    return {"processed": processed, "failed": failed, "remaining": remaining}


if __name__ == "__main__":
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    result = process_pending(limit=limit)
    print()
    print("=== pipeline result ===")
    print(result)
