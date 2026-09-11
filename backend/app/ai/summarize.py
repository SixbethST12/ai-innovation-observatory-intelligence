"""
summarize.py — Generate a 6-section summary for one publication.

PURPOSE:
    Turn a stored publication's title + abstract into a concise,
    structured summary covering the six sections specified by the
    project proposal.

RESPONSIBILITIES:
    1. Build the summary prompt (prompts.build_summary_prompt).
    2. Call the LLM client (llm.ask with task="summarize").
    3. Return (summary_text, engine) so the caller can record provenance.

USED BY:
    - app/ai/pipeline.py

NOTES:
    - If no text is available (no abstract, no raw_content), returns a
      placeholder and engine="rule-based".
    - The 6-section format is enforced only through the prompt; we do
      not validate the model's output shape.
"""

from .llm import ask
from .prompts import build_summary_prompt


PLACEHOLDER = "[fallback] Summary unavailable — no abstract or content."


def summarize(title: str, text: str | None) -> tuple[str, str]:
    """
    Return (summary, engine).

    If `text` is empty, skip the LLM and return the placeholder.
    """
    if not text or not text.strip():
        return PLACEHOLDER, "rule-based"

    prompt = build_summary_prompt(title, text)
    return ask(prompt, task="summarize")
