"""
prompts.py — All LLM prompt templates for the AI layer.

PURPOSE:
    Keep every prompt in one file so they can be reviewed, tuned, and
    versioned without touching business logic.

RESPONSIBILITIES:
    1. Provide prompt-builder functions for each task.
    2. Inject publication text and topic list into templates.
    3. Enforce output format so parsers can rely on it.

USED BY:
    - app/ai/summarize.py
    - app/ai/classify.py
    - app/ai/relevance.py

NOTES:
    - Keep prompts short. Small models lose focus on long prompts.
    - Few-shot examples in the classify prompt improve accuracy on
      1.5B–3B models.
    - The BOT disclaimer is defined HERE so it can't be forgotten.
"""


BOT_DISCLAIMER = (
    "AI-generated assessment — not an official Bank of Tanzania position."
)


def build_summary_prompt(title: str, text: str) -> str:
    """Ask for a 6-section summary in plain text."""
    body = text.strip()[:800]
    return f"""You are a research assistant for a central bank. Summarize the publication below.

Use exactly these six section headers, each on its own line:
1. Main topic:
2. Purpose/objective:
3. Key findings:
4. Major developments:
5. Policy or regulatory considerations:
6. Potential relevance to central banking:

Be concise. If information is missing, write "Not stated".

TITLE: {title}
CONTENT: {body}

SUMMARY:"""


def build_classify_prompt(title: str, text: str, topic_list: list[str]) -> str:
    """Ask for 1-3 topic slugs, with few-shot examples to anchor output."""
    body = text.strip()[:1200]
    topics_str = "\n".join(f"- {slug}" for slug in topic_list)
    return f"""Task: classify a central-banking publication into topic slugs.

Allowed slugs (choose ONLY from this list):
{topics_str}

Rules:
- Output 1 to 3 slugs, comma-separated, on one line.
- No explanations, no extra words.
- Prefer the single most specific slug first.

Examples:
Title: Cyber resilience toolkit for financial market infrastructures
Topics: cybersecurity, financial_markets

Title: Inflation targeting in emerging markets
Topics: monetary_policy

Title: Mobile money and access to finance in East Africa
Topics: financial_inclusion, digital_finance

Now classify this publication:

TITLE: {title}
CONTENT: {body}

TOPICS:"""


def build_relevance_prompt(title: str, text: str) -> str:
    """Ask for a BOT relevance note. Disclaimer is added by the caller."""
    body = text.strip()[:1200]
    return f"""You advise analysts at the Bank of Tanzania.

In 2 to 3 sentences, explain why the following publication may be relevant
to the Bank of Tanzania's work (monetary policy, financial stability,
supervision, digital finance, or related areas).

Do NOT give policy recommendations. Do NOT speak on behalf of the Bank.

TITLE: {title}
CONTENT: {body}

RELEVANCE:"""
