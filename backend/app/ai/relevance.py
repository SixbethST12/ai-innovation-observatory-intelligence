"""
relevance.py — Generate a BOT relevance note for a publication.

PURPOSE:
    Produce an AI-assisted assessment of why a publication may matter
    to the Bank of Tanzania. The note is explicitly labeled as AI-generated
    and never presented as an official Bank position.

RESPONSIBILITIES:
    1. Build the relevance prompt (prompts.build_relevance_prompt).
    2. Call the LLM client (llm.ask with task="relevance").
    3. Append the BOT disclaimer so traceability and labeling are guaranteed.

USED BY:
    - app/ai/pipeline.py

NOTES:
    - The disclaimer is added HERE, not inside the prompt, so that it is
      always present even when the fallback engine produces the text.
    - Output is a single string: "<note>\n\n<disclaimer>".
"""

from .llm import ask
from .prompts import build_relevance_prompt, BOT_DISCLAIMER


def relevance(title: str, text: str | None) -> tuple[str, str]:
    """
    Return (relevance_text_with_disclaimer, engine).

    If no text is available, use a generic template + disclaimer.
    """
    body = (text or "").strip()
    if not body:
        note = "Relevance could not be assessed (no abstract or content)."
        return f"{note}\n\n{BOT_DISCLAIMER}", "rule-based"

    prompt = build_relevance_prompt(title, body)
    note, engine = ask(prompt, task="relevance")

    # Ensure the disclaimer appears exactly once
    if BOT_DISCLAIMER not in note:
        note = f"{note.strip()}\n\n{BOT_DISCLAIMER}"

    return note, engine
