"""
config.py — Central configuration for the backend.

PURPOSE:
    Single place for environment-driven settings (database URL, API
    settings, LLM endpoint) so nothing is hard-coded across modules.

RESPONSIBILITIES:
    1. Load .env file via python-dotenv.
    2. Expose settings as plain module-level constants.
    3. Default to SQLite for local dev; swap to PostgreSQL via .env.

USED BY:
    - app/database.py        (DATABASE_URL)
    - app/ai/*               (OLLAMA_URL, LLM_MODEL)
    - app/routers/*          (API metadata)
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/ root
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'observatory.db'}")

# LLM (Layer 4)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:3b")

# API metadata
API_TITLE = "AI Innovation Observatory API"
API_VERSION = "0.1.0"
