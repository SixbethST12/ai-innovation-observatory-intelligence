# AI Innovation Observatory for Central Banking & Financial Sector Intelligence

A prototype intelligence platform that automatically monitors trusted central
banking and financial-sector sources, uses a local LLM to summarize and classify
publications, and surfaces emerging trends relevant to the Bank of Tanzania.

Built as a student project for the Bank of Tanzania (BoT).

## What it does

- Monitors BIS, IMF, World Bank, CBK + any user-added RSS source
- Stores publications with full metadata and source traceability
- Uses a local LLM (Ollama + qwen2.5:3b) to generate:
  - 6-section summaries (topic, purpose, findings, developments, policy, relevance)
  - 1-3 topic classifications (from 11 canonical central-banking topics)
  - Relevance notes for the Bank of Tanzania (labeled as AI-generated)
- Detects emerging trends by comparing recent vs. prior publication counts
- Surfaces live system alerts and user-defined alert rules
- Exposes everything through a FastAPI backend and a React dashboard
- Every AI insight traces back to its original source URL

## Quick start (Docker)

Prerequisites:
- Docker + Docker Compose
- Ollama installed on the host (curl -fsSL https://ollama.com/install.sh | sh)
- Model pulled: ollama pull qwen2.5:3b

Run:

    docker compose up -d
    docker compose ps

Open http://localhost:5173 in your browser.

Default accounts:
- Analyst: analyst / analyst123
- Admin:   admin / admin123

Initialize data (first run only):

    docker exec -it observatory-backend python -c "from app.database import init_db; init_db()"
    docker exec -it observatory-backend python -c "from app.collectors.scheduler import run_all; from app.storage import save_publications; print(save_publications(run_all()))"
    docker exec -itd observatory-backend python -m app.ai.pipeline

The AI pipeline takes 30-60 minutes for the initial ~150 publications on CPU.

## Documentation

| Document | Purpose |
|---|---|
| docs/SOURCES.md | The 4 built-in sources + how to add custom RSS |
| docs/AI_LIMITATIONS.md | Honest assessment of model accuracy |
| docs/USER_GUIDE.md | How analysts and admins use the system |
| docs/TEST_REPORT.md | Manual evaluation results |

## Architecture

Seven layers, bottom-up:

| Layer | Tech | Purpose |
|---|---|---|
| 1. External Sources | BIS, IMF, World Bank, CBK, custom RSS | Where publications come from |
| 2. Data Collection | Python (feedparser, requests, BeautifulSoup) | Scheduled retrieval + duplicate detection |
| 3. Data Layer | SQLite + SQLAlchemy | Persistent storage + AI output |
| 4. AI & Intelligence | Ollama + qwen2.5:3b | Summarization, classification, relevance, trends |
| 5. API Layer | FastAPI | REST endpoints for the frontend |
| 6. Presentation | React 19 + Vite + Tailwind + shadcn/ui | Analyst-facing dashboard |
| 7. Users | BoT analysts, researchers, admins | Consumers of the intelligence |

## Repository layout

    ai-innovation-observatory-intelligence/
      backend/                    FastAPI + Python pipeline
        app/
          ai/                     LLM client, summarize, classify, relevance, trends
          collectors/             BIS, IMF, World Bank, CBK + generic RSS
          jobs/                   Background job manager
          routers/                REST endpoints (incl. admin)
          config.py               Environment settings
          database.py             SQLAlchemy engine + session
          main.py                 FastAPI app
          models.py               ORM models (PublicationRow, Source, AlertRule, RuleMatch)
          storage.py              Persist publications + trigger rule matching
          topics.py               11 canonical topic categories
          users.py                In-memory user store (prototype)
        requirements.txt
        observatory.db            SQLite database (gitignored)
      frontend/                   React dashboard
        src/
          components/ui/          shadcn/ui primitives
          lib/api.ts              HTTP client
          pages/                  Dashboard, Publications, Trends, Search, KB, Alerts
          pages/admin/            Admin Dashboard, Sources, Publications, Topics, Users
      docs/                       Documentation (see table above)
      docker-compose.yml
      backend/Dockerfile
      frontend/Dockerfile
      start-all.sh                (Codespaces helper — starts all services)
      stop-all.sh
      README.md                   This file

## Key API endpoints

| Endpoint | Purpose |
|---|---|
| GET /stats | Summary counts + orphaned sources |
| GET /stats/timeline | Publications per month |
| GET /publications | List + filters (institution, topic, date) |
| GET /publications/{id} | Single publication detail |
| GET /search?q=... | Keyword search |
| GET /trends | Topic frequencies |
| GET /trends/emerging | Top emerging topics |
| GET /trends/timeline | Topic mentions per month |
| GET /trends/institutions | Publications per source + hidden/orphaned counts |
| GET /trends/insights | Rule-based bullets + AI narrative |
| GET /trends/glance | Top 3 topics + AI brief (cached) |
| GET /admin/logs | Job states + counts |
| GET /admin/sources / POST /admin/sources/test | Built-in + test custom source |
| GET /admin/publications | Admin publication list with filters |
| POST /admin/publications/bulk-reset-ai | Re-run AI on selected |
| POST /admin/publications/bulk-hide | Hide selected |
| POST /admin/publications/manual | Add a manual publication |
| GET /admin/rules / POST /admin/rules | Alert rules |
| GET /admin/users | User list |
| POST /admin/users/verify | Login verification |
| GET /admin/alerts | Live system alerts |
| GET /admin/activity | Recent activity feed |
| GET /admin/scheduler/status | Scheduler state |

Full interactive docs: http://localhost:8000/docs.

## AI honesty

- Model: qwen2.5:3b, a small local LLM — zero-cost, private inference
- Classification accuracy: ~65-75% top-1 on the manual eval set
- Every AI-generated relevance note carries the disclaimer:
  "AI-generated assessment — not an official Bank of Tanzania position."
- A rule-based fallback runs when Ollama is unavailable
- The ai_engine column records which engine produced each output

See docs/AI_LIMITATIONS.md for the full breakdown.

## License

MIT — see LICENSE.
