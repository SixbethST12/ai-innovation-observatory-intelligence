"""
trend_insights.py — Rule-based + AI insights about trends.
"""

from .ai.trends import emerging_topics, topic_frequencies, institution_distribution
from .ai.llm import ask
from .ai.prompts import BOT_DISCLAIMER


def _bullets(months_back: int = 3) -> list:
    emerging = emerging_topics(months_back=months_back, top_n=10)
    frequencies = topic_frequencies()
    institutions = institution_distribution()

    bullets = []

    for e in emerging[:3]:
        name = e["topic"].replace("_", " ")
        if e["prior"] == 0 and e["recent"] > 0:
            bullets.append(
                f"{name} is new — {e['recent']} mention{'s' if e['recent'] != 1 else ''} "
                f"where there were 0 in the prior period."
            )
        elif e["score"] >= 5:
            ratio = round(e["recent"] / max(e["prior"], 1), 1)
            bullets.append(
                f"{name} is the fastest-growing topic — {e['recent']} mentions this period vs "
                f"{e['prior']} prior ({ratio}x increase)."
            )
        else:
            bullets.append(
                f"{name} is trending upward — recent {e['recent']}, prior {e['prior']}."
            )

    if frequencies:
        top = frequencies[0]
        bullets.append(
            f"{top['topic'].replace('_', ' ').title()} dominates — "
            f"{top['count']} mentions across the corpus."
        )

    if len(frequencies) > 3 and frequencies[-1]["count"] > 0:
        weakest = frequencies[-1]
        bullets.append(
            f"{weakest['topic'].replace('_', ' ').title()} is lagging — "
            f"only {weakest['count']} mention{'s' if weakest['count'] != 1 else ''} in total."
        )

    if institutions:
        total = sum(i["count"] for i in institutions)
        top_inst = institutions[0]
        pct = round(top_inst["count"] / total * 100) if total else 0
        if pct >= 40:
            bullets.append(
                f"{top_inst['institution']} dominates coverage at {pct}% of all publications."
            )

    return bullets[:6]


def _build_narrative(topics_list: list, months_back: int):
    if not topics_list:
        return "Not enough classified publications to detect trends yet.", "rule-based"

    names = ", ".join(t["topic"].replace("_", " ") for t in topics_list[:3])
    prompt = (
        f"You are a research analyst for the Bank of Tanzania.\n\n"
        f"The most active topics over the last {months_back} months are: {names}.\n\n"
        f"Write a 2-3 sentence intelligence brief on what is driving these trends. "
        f"Do NOT give policy recommendations. Do NOT speak on behalf of the Bank.\n\n"
        f"BRIEF:"
    )
    return ask(prompt, task="summarize")


def generate_insights(months_back: int = 3) -> dict:
    from .cache import get as cache_get, set as cache_set

    cache_key = f"insights:{months_back}"
    cached = cache_get(cache_key, ttl_seconds=600)
    if cached is not None:
        return cached

    emerging = emerging_topics(months_back=months_back, top_n=3)
    bullets = _bullets(months_back)
    narrative, engine = _build_narrative(emerging, months_back)

    result = {
        "bullets": bullets,
        "narrative": narrative,
        "disclaimer": BOT_DISCLAIMER,
        "engine": engine,
    }
    cache_set(cache_key, result, ttl_seconds=600)
    return result
