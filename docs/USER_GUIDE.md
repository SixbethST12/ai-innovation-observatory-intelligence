# User Guide — AI Innovation Observatory

A practical guide for Bank of Tanzania analysts, researchers, and
financial-sector intelligence staff.

---

## Getting Started

### URL

- **Local deployment:** `http://localhost:5173`
- **Codespaces:** the forwarded port URL for 5173

### First Login

Two default accounts exist:

| Role | Username | Password | Access |
|---|---|---|---|
| Analyst | `analyst` | `analyst123` | Read-only browsing + search + alerts |
| Admin | `admin` | `admin123` | Full access + source management + user management |

Pick the correct tab (Analyst or Admin) before entering credentials.
Logging in with the wrong tab shows an error.

**Admins can add more users** — see "Managing Users" below.

---

## Analyst Workflow

### 1. Dashboard — Your Morning Brief

Open the Dashboard first thing each day. It shows:

- **Total publications** — how many documents the Observatory has collected
- **Sources monitored** — how many feeds are active (with a warning if some sources
  were deleted but their publications remain)
- **Emerging trends** — count of topics with recent activity
- **AI processed** — how many publications have been summarized and classified

Below the stats:
- **Source Distribution** — which institutions publish the most
- **Frequently Discussed Subjects** — top topics in the current corpus
- **Emerging Trends** — topics growing fastest this quarter
- **Publication Timeline** — monthly activity over the last 12 months
- **Recent Publications** — the latest 6 documents
- **Intelligence at a Glance** — an AI-generated brief on the top 3 emerging topics
- **High-Relevance Publications** — the analyst's first stop for important items

**Filters:**
- Time range (Last 7 days / 30 days / 90 days / All time) affects the Recent Publications list
- Alert banner at the top — dismiss it to hide it for the session

### 2. Publications — Browse Everything

Use **Publications** to see every document in the corpus.

**Filters:**
- **Search** — searches titles, abstracts, and AI summaries
- **Source** — filter to BIS, IMF, World Bank, CBK, or any custom source
- **Topic** — one of the 11 canonical topics
- **Date range** — last 7 / 30 / 365 days
- **Relevance** — High / Medium / Low (based on topic coverage)

**Sorting:** click the column headers (Title, Source, Date, Relevance)

**Views:** toggle between Table and Grid

**Detail view:** click any row → a side drawer slides in with:
- AI summary (6 sections)
- Assigned topics
- Relevance note for the Bank
- Link to the original source
- Prev/Next arrows to move through results

**Export:** click **Export CSV** to download the current filtered list.

### 3. Trends & Insights — What's Moving

Track topic dynamics over time.

- **Trend of Key Topics Over Time** — multi-color line chart of the top 6 topics
- **Key Insights** — rule-based bullets + AI narrative (cached 10 min)
- **Emerging Trends** — ranked list of growing topics
- **Topic Growth Rate** — bar chart showing % growth per topic
- **Topic Distribution** — full corpus coverage by topic

**Filters:** time range (3 / 6 / 12 months)

### 4. Topic Classification — Browse by Category

See the 11 canonical topics as tiles. Click any tile to see all publications
in that topic, sorted by date.

### 5. Search & Discover — Semantic-style Search

Search across the entire corpus. Filter by source, topic, relevance.
The **Query Insights** panel on the right shows which topics appear most
in your results and how the results are distributed by source.

### 6. Knowledge Base — Three Browse Modes

- **Browse by Topic** — 11 tiles, click for a drawer of all pubs in that topic
- **Browse by Source** — 4 source tiles with counts
- **Browse by Time** — 12 monthly tiles

Each opens the same drawer view with clickable links to originals.

### 7. Alerts & Notifications — Stay Informed

- **System Alerts** — live updates every 5 seconds:
  - Service health (Ollama, backend, frontend)
  - Job progress (collection, AI pipeline) with progress bars
  - Rule matches
- **Rule Matches** — publications matched by your watch rules
- **Create Alert Rule** — set up a custom rule:
  - Keyword (required)
  - Source (optional)
  - Topic (optional)
  - Priority (high / medium / low)
- **Active Rules** — manage your rules

**Rules run automatically** after each new collection. When a rule matches,
you'll see it appear in Rule Matches and in the bell dropdown in the header.

---

## Admin Workflow

Log in with the **Admin** tab. The sidebar shows admin-only pages in addition
to the analyst views.

### Admin Panel

Your control center:
- **Service Status** — Ollama, backend, frontend health
- **Collect Publications** — manual trigger for a new collection run
- **AI Pipeline** — shows processing progress, includes:
  - **Run AI** — process pending publications
  - **Retry failed** — reset rule-based rows so they're reprocessed
- **Automatic Scheduler** — set up auto-collection every 15 min to 6 hours
- **Recent Activity** — chronological feed of jobs, rule matches, and publications

### Manage Sources

- **Built-in Sources** — 4 read-only collectors (BIS, IMF, World Bank, CBK)
- **Add RSS Source** — add any RSS 2.0 or Atom feed:
  1. Enter a name and RSS URL
  2. Click **Test feed** — shows entries count if valid
  3. Click **Add source** — saves to the backend
- **Custom Sources** — your added sources (with delete option)
- **Run collection now** — triggers a collection across all active sources

**Note:** Deleting a source keeps its previously collected publications
(they're marked "orphaned" on the Dashboard).

### Manage Publications

- **Stat cards** — Total / Pending AI / Fallback / Hidden / Manual
- **Filter tabs** — All / Pending AI / Fallback / Hidden / Manual
- **Search + source filter**
- **Bulk actions** — check rows, then:
  - **Re-run AI** — reprocess selected publications
  - **Hide** — remove from analyst views (reversible)
  - **Unhide** — restore
- **Add manually** — paste in a publication from an offline source:
  - Title + source URL required
  - Optional: institution, date, abstract
  - Checkbox: run AI immediately

**No delete** — use Hide instead. This preserves traceability.

### Manage Topics

Read-only view of the 11 canonical topics with counts and keywords.
To change topics, edit `backend/app/topics.py` and restart the backend.

### Manage Users

- **Add User** — username, full name, password, role
- **Active Users** — list with delete
- **Protection:** cannot delete the last admin

**Note:** Users reset when the backend restarts (in-memory store).
For persistent users, integrate with a real auth system.

### Alerts & Notifications

Same as analysts — plus system-wide alerts.

---

## Common Tasks

### "I need to see everything about digital finance this month"

1. Publications
2. Set Topic = digital_finance
3. Set Date range = Last 30 days
4. Click Export CSV if you need it offline

### "I want to be notified about CBDC developments"

1. Alerts & Notifications
2. Keyword: `CBDC`
3. Priority: High
4. Add Rule

You'll see matches after each collection run.

### "The AI summary looks wrong"

Two options:
- Open the source (link in the detail drawer) and read it yourself
- Ask an admin to re-run the AI on that publication (Admin → Manage Publications → select row → Re-run AI)

### "I want to add a new central bank's feed"

Ask an admin. They'll use **Admin → Manage Sources → Add RSS Source**.

### "Publication X is off-topic / not relevant"

Ask an admin to **Hide** it in **Admin → Manage Publications**. It won't appear in analyst views anymore, but the source record is preserved.

### "I need to export data for a report"

Publications page → apply filters → **Export CSV**.

---

## Understanding the Data

### Confidence signals

- **AI engine badge** — "AI" (from Ollama) or "Fallback" (rule-based)
- **Relevance badge** — High / Medium / Low based on topic coverage
- **Source badge** — which institution published it

### Traceability

**Every AI-generated output links back to its original source.** Click any
"Original source" or "Open" button to verify. Never trust an AI summary without
at least skimming the source.

### Known limitations

See `docs/AI_LIMITATIONS.md` for a full breakdown. Key takeaways:

- Summaries are first drafts — verify
- Classification is ~65–75% accurate at top-1
- Fallback rows mean Ollama was offline when they were processed
- Trend insights are cached for 10 minutes

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Dashboard shows 0 publications | Click "Run collection now" in Admin → Manage Sources |
| Summary says "[fallback] LLM offline" | Ollama was down during processing; ask admin to Re-run AI |
| Search returns no results | Clear filters; try broader keywords |
| Alerts page shows nothing | System is healthy — no alerts are currently active |
| Login fails | Check that you picked the correct tab (Analyst vs Admin) |

---

## Getting Help

- **Admin issues:** contact the system administrator
- **AI accuracy concerns:** see `docs/AI_LIMITATIONS.md`
- **Technical details:** see `README.md` and `docs/SOURCES.md`
