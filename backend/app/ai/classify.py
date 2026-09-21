"""
classify.py — Assign 1–3 topic slugs to a publication.

PURPOSE:
    Map each stored publication to one or more of the 11 canonical
    central-banking topic categories defined in app.topics.

RESPONSIBILITIES:
    1. Build the classification prompt.
    2. Call the LLM client.
    3. Parse and validate slugs against app.topics.
    4. Fall back to keyword matching — never return empty.
    5. If keyword matching also fails, return a sensible default
       so every processed publication has at least one topic.
"""

from .llm import ask
from .prompts import build_classify_prompt
from ..topics import TOPIC_SLUGS, TOPICS


# Institution → likely default topic when nothing else matches.
# This is a last-resort fallback so no pub ends up topic-less.
DEFAULT_BY_INSTITUTION = {
    "BIS": "monetary_policy",
    "IMF": "monetary_policy",
    "World Bank": "financial_inclusion",
    "CBK": "banking_regulation",
    "ECB": "monetary_policy",
    "Federal Reserve": "monetary_policy",
}

# Generic corporate/governance words that map to financial_stability
GOVERNANCE_WORDS = ["governance", "summit", "youth", "address", "interview", "speech"]


def _clean_slugs(raw: str) -> list[str]:
    """Split, strip, lowercase, and keep only valid topic slugs."""
    parts = [p.strip().lower() for p in raw.replace("\n", ",").split(",")]
    valid = [p for p in parts if p in TOPIC_SLUGS]
    seen, out = set(), []
    for s in valid:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out[:3]


def _keyword_fallback(title: str, text: str, institution: str = "") -> list[str]:
    """Match topic keywords in the title/text — deterministic fallback."""
    haystack = f"{title} {text}".lower()
    hits: list[str] = []
    for slug, meta in TOPICS.items():
        for kw in meta["keywords"]:
            if kw.lower() in haystack:
                hits.append(slug)
                break

    # No keyword hits? Try governance / generic speech heuristics
    if not hits:
        if any(w in haystack for w in GOVERNANCE_WORDS):
            hits.append("financial_stability")

    # Still nothing? Use institution default
    if not hits and institution in DEFAULT_BY_INSTITUTION:
        hits.append(DEFAULT_BY_INSTITUTION[institution])

    # Absolute last resort — monetary_policy is the most general
    if not hits:
        hits.append("monetary_policy")

    return hits[:3]


def classify(title: str, text: str | None, institution: str = "") -> tuple[list[str], str]:
    """
    Return (topics, engine).

    topics is a list of 1–3 valid slug strings — never empty.
    engine is "ollama" or "rule-based".
    """
    body = (text or "").strip()
    if not body:
        return _keyword_fallback(title, "", institution), "rule-based"

    prompt = build_classify_prompt(title, body, TOPIC_SLUGS)
    raw, engine = ask(prompt, task="classify")

    slugs = _clean_slugs(raw)
    if slugs:
        return slugs, engine

    # LLM reply was unusable — fall back to keyword matching
    return _keyword_fallback(title, body, institution), "rule-based"
