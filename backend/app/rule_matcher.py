"""
rule_matcher.py — Match new publications against user rules.

PURPOSE:
    After new publications are collected, check each active AlertRule
    and record matches for the frontend to surface.

RESPONSIBILITIES:
    1. match_new_publications(pub_ids) — check rules for given pub IDs.
    2. Return the number of new matches created.

USED BY:
    - app/storage.py after save_publications
    - app/jobs/manager.py (indirectly via collection)
"""

from datetime import datetime, timezone

from .database import SessionLocal
from .models import AlertRule, RuleMatch, PublicationRow


def _matches(rule: AlertRule, pub: PublicationRow) -> bool:
    """Return True if the publication satisfies the rule."""
    # Source filter
    if rule.source and rule.source != "all":
        if pub.institution != rule.source:
            return False

    # Topic filter
    if rule.topic and rule.topic != "all":
        topics = [t.strip() for t in (pub.ai_topics or "").split(",") if t.strip()]
        if rule.topic not in topics:
            return False

    # Keyword filter (case-insensitive) across title + abstract + summary
    kw = (rule.keyword or "").lower().strip()
    if kw:
        haystack = " ".join([
            (pub.title or ""),
            (pub.abstract or ""),
            (pub.ai_summary or ""),
            (pub.ai_topics or ""),
        ]).lower()
        if kw not in haystack:
            return False

    return True


def match_new_publications(pub_ids: list[int]) -> int:
    """Check rules against given publication IDs. Returns count of new matches."""
    if not pub_ids:
        return 0

    db = SessionLocal()
    matches_created = 0
    try:
        rules = db.query(AlertRule).filter(AlertRule.active.is_(True)).all()
        if not rules:
            return 0

        pubs = db.query(PublicationRow).filter(PublicationRow.id.in_(pub_ids)).all()
        for pub in pubs:
            for rule in rules:
                if _matches(rule, pub):
                    # Skip if this rule already matched this pub
                    existing = (
                        db.query(RuleMatch)
                        .filter(RuleMatch.rule_id == rule.id)
                        .filter(RuleMatch.publication_id == pub.id)
                        .first()
                    )
                    if existing:
                        continue
                    db.add(RuleMatch(rule_id=rule.id, publication_id=pub.id))
                    matches_created += 1

        db.commit()
        return matches_created
    finally:
        db.close()
