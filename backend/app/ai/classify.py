"""
classify.py — Assign 1–3 topic slugs to a publication.

PURPOSE:
    Map each stored publication to one or more of the 11 canonical
    central-banking topic categories defined in app.topics.

RESPONSIBILITIES:
    1. Build the classification prompt (prompts.build_classify_prompt).
    2. Call the LLM client (llm.ask with task="classify").
    3. Parse the model's reply into a clean list of valid slugs.
    4. Drop anything not in app.topics.TOPIC_SLUGS (prevents hallucination).

USED BY:
    - app/ai/pipeline.py

NOTES:
    - Model output is expected as "slug1, slug2" on one line.
    - We accept up to 3 slugs; if more come back, keep the first 3.
    - If no valid slug survives validation, we fall back to a simple
      keyword matcher so every publication gets at least one topic.
"""

from .llm import ask
from .prompts import build_classify_prompt
from ..topics import TOPIC_SLUGS, TOPICS


def _clean_slugs(raw: str) -> list[str]:
    """Split, strip, lowercase, and keep only valid topic slugs."""
    parts = [p.strip().lower() for p in raw.replace("\n", ",").split(",")]
    valid = [p for p in parts if p in TOPIC_SLUGS]
    # de-duplicate while preserving order
    seen, out = set(), []
    for s in valid:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out[:3]


def _keyword_fallback(title: str, text: str) -> list[str]:
    """Match topic keywords in the title/text — deterministic fallback."""
    haystack = f"{title} {text}".lower()
    hits: list[str] = []
    for slug, meta in TOPICS.items():
        for kw in meta["keywords"]:
            if kw.lower() in haystack:
                hits.append(slug)
                break
    return hits[:3]


def classify(title: str, text: str | None) -> tuple[list[str], str]:
    """
    Return (topics, engine).

    topics is a list of 0–3 valid slug strings.
    engine is "ollama" or "rule-based".
    """
    body = (text or "").strip()
    if not body:
        return _keyword_fallback(title, ""), "rule-based"

    prompt = build_classify_prompt(title, body, TOPIC_SLUGS)
    raw, engine = ask(prompt, task="classify")

    slugs = _clean_slugs(raw)
    if slugs:
        return slugs, engine

    # LLM reply was unusable — fall back to keyword matching
    return _keyword_fallback(title, body), "rule-based"
