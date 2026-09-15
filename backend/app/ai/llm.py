"""
llm.py — Swappable LLM client with Ollama primary + rule-based fallback.

PURPOSE:
    Provide a single `ask(prompt, task)` function that the AI modules
    call to get text from an LLM. Tries Ollama first; if unavailable,
    falls back to a rule-based handler so the pipeline never stalls.

RESPONSIBILITIES:
    1. `ask(prompt, task)` — main entry point used by summarize/classify/relevance.
    2. Try Ollama via HTTP (localhost:11434).
    3. On failure, delegate to the rule-based fallback for that task.
    4. Return (text, engine) so callers can store which engine produced output.

TASKS SUPPORTED:
    "summarize" | "classify" | "relevance"

USED BY:
    - app/ai/summarize.py
    - app/ai/classify.py
    - app/ai/relevance.py
    - app/ai/pipeline.py

NOTES:
    - Fallback functions live in this module for simplicity; they are
      NOT LLM outputs and are labeled as "rule-based" downstream.
    - Timeout default is generous (60s) because qwen2.5:1.5b on CPU is slow.
"""

import json
import requests

from ..config import OLLAMA_URL, LLM_MODEL


OLLAMA_GENERATE = f"{OLLAMA_URL}/api/generate"
LLM_TIMEOUT = 180


def _ollama_ask(prompt: str) -> str | None:
    """Call Ollama; return text or None on any failure."""
    try:
        r = requests.post(
            OLLAMA_GENERATE,
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2},   # low temp for consistency
            },
            timeout=LLM_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        text = (data.get("response") or "").strip()
        return text or None
    except Exception as e:
        print(f"[llm] Ollama failed: {e}")
        return None


def _rule_fallback(prompt: str, task: str) -> str:
    """
    Deterministic fallback when Ollama is unavailable.

    These are NOT real AI outputs — they are placeholders so the pipeline
    can continue and the DB can be filled. The `ai_engine` column records
    "rule-based" so downstream consumers know the difference.
    """
    if task == "summarize":
        return "[fallback] Summary unavailable — LLM offline."
    if task == "classify":
        return ""   # empty means: no topics assigned
    if task == "relevance":
        return ("[fallback] AI-generated assessment — not an official "
                "Bank of Tanzania position.")
    return ""


def ask(prompt: str, task: str) -> tuple[str, str]:
    """
    Query the LLM with fallback.

    Args:
        prompt: full prompt string.
        task:   "summarize" | "classify" | "relevance".

    Returns:
        (text, engine) where engine is "ollama" or "rule-based".
    """
    text = _ollama_ask(prompt)
    if text is not None:
        return text, "ollama"
    return _rule_fallback(prompt, task), "rule-based"
