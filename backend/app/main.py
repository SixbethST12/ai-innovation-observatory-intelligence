"""
main.py — FastAPI application entry point.

PURPOSE:
    Expose the Observatory's data and AI-generated intelligence to the
    frontend via a REST API.

RESPONSIBILITIES:
    1. Create the FastAPI app with metadata.
    2. Enable CORS so the React frontend can call it.
    3. Register all routers (publications, search, trends, stats).
    4. Provide a /health endpoint.

USED BY:
    - `uvicorn app.main:app --reload` during development.
    - Frontend calls e.g. http://localhost:8000/publications

NOTES:
    - Routers live in app/routers/*.py.
    - CORS is permissive in dev; tighten before deployment.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import API_TITLE, API_VERSION


app = FastAPI(title=API_TITLE, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": API_VERSION}


# Routers are imported AFTER app is created to avoid circular imports
from .routers import publications, search, trends, stats, admin  # noqa: E402

app.include_router(publications.router)
app.include_router(search.router)
app.include_router(trends.router)
app.include_router(stats.router)
app.include_router(admin.router)
