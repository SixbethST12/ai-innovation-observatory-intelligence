"""
topics.py — Canonical topic taxonomy for the Observatory.

PURPOSE:
    Single source of truth for the 11 central-banking topic categories
    the system classifies and filters publications by.

USED BY:
    - collectors/*.py     (to build source queries)
    - ai/classifier.py    (to constrain LLM classification output)
    - routers/*.py        (to expose topic lists to the frontend)
    - frontend            (to render filters, charts, legends)

NOTES:
    - Edit here only. Everything else imports from this module.
    - Keys are stable slugs (used in DB and API).
    - Values are human-readable labels (used in UI).
    - `keywords` help collectors build search queries and help the
      classifier when LLM output needs validation.
"""

TOPICS = {
    "monetary_policy": {
        "label": "Monetary Policy",
        "keywords": ["monetary policy", "interest rate", "inflation targeting", "central bank policy"],
    },
    "financial_stability": {
        "label": "Financial Stability",
        "keywords": ["financial stability", "systemic risk", "macroprudential", "stress test"],
    },
    "banking_regulation": {
        "label": "Banking Regulation",
        "keywords": ["banking regulation", "supervision", "capital requirements", "basel"],
    },
    "financial_markets": {
        "label": "Financial Markets",
        "keywords": ["financial markets", "bond market", "equity market", "market infrastructure"],
    },
    "digital_finance": {
        "label": "Digital Finance",
        "keywords": ["digital finance", "digital banking", "mobile money", "digital payments"],
    },
    "fintech": {
        "label": "FinTech",
        "keywords": ["fintech", "financial technology", "neobank", "open banking"],
    },
    "artificial_intelligence": {
        "label": "Artificial Intelligence",
        "keywords": ["artificial intelligence", "machine learning", "ai in finance", "generative ai"],
    },
    "payment_systems": {
        "label": "Payment Systems",
        "keywords": ["payment systems", "instant payments", "rtgs", "cross-border payments"],
    },
    "cybersecurity": {
        "label": "Cybersecurity",
        "keywords": ["cybersecurity", "cyber resilience", "fraud", "operational risk"],
    },
    "climate_finance": {
        "label": "Climate and Sustainable Finance",
        "keywords": ["climate finance", "sustainable finance", "green finance", "esg"],
    },
    "financial_inclusion": {
        "label": "Financial Inclusion",
        "keywords": ["financial inclusion", "access to finance", "unbanked", "msme finance"],
    },
}

TOPIC_SLUGS = list(TOPICS.keys())
TOPIC_LABELS = {slug: meta["label"] for slug, meta in TOPICS.items()}
