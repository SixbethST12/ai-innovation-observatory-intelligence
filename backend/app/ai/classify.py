"""
classify.py — Assign 1–3 topic slugs (loaded from DB) to a publication.
"""
from .llm import ask
from .prompts import build_classify_prompt
from ..topic_store import list_topics


# Institution → default topic slug when nothing else matches
DEFAULT_BY_INSTITUTION = {
    "BIS": "monetary_policy",
    "IMF": "monetary_policy",
    "World Bank": "financial_inclusion",
    "CBK": "banking_regulation",
    "ECB": "monetary_policy",
    "Federal Reserve": "monetary_policy",
}

GOVERNANCE_WORDS = ["governance", "summit", "youth", "address", "interview", "speech"]


def _load_topics():
    """Load topics from DB and build lookup maps."""
    topics = list_topics(active_only=True)
    slugs = [t["slug"] for t in topics]
    labels = {t["slug"]: t["label"] for t in topics}
    keywords = {t["slug"]: t["keywords"] for t in topics}
    return slugs, labels, keywords


def _clean_slugs(raw: str, valid_slugs: list[str]) -> list[str]:
    parts = [p.strip().lower() for p in raw.replace("\n", ",").split(",")]
    valid = [p for p in parts if p in valid_slugs]
    seen, out = set(), []
    for s in valid:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out[:3]


def _keyword_fallback(title: str, text: str, institution: str,
                     keywords: dict, slugs: list[str]) -> list[str]:
    haystack = f"{title} {text}".lower()
    hits = []
    for slug in slugs:
        for kw in keywords.get(slug, []):
            if kw.lower() in haystack:
                hits.append(slug)
                break
    if not hits:
        if any(w in haystack for w in GOVERNANCE_WORDS):
            hits.append("financial_stability" if "financial_stability" in slugs else slugs[0])
    if not hits and institution in DEFAULT_BY_INSTITUTION:
        d = DEFAULT_BY_INSTITUTION[institution]
        hits.append(d if d in slugs else slugs[0])
    if not hits:
        hits.append(slugs[0] if slugs else "monetary_policy")
    return hits[:3]


def classify(title: str, text: str | None, institution: str = "") -> tuple[list[str], str]:
    slugs, _, keywords = _load_topics()
    if not slugs:
        return [], "rule-based"

    body = (text or "").strip()
    if not body:
        return _keyword_fallback(title, "", institution, keywords, slugs), "rule-based"

    prompt = build_classify_prompt(title, body, slugs)
    raw, engine = ask(prompt, task="classify")

    cleaned = _clean_slugs(raw, slugs)
    if cleaned:
        return cleaned, engine
    return _keyword_fallback(title, body, institution, keywords, slugs), "rule-based"
