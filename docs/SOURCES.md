# Approved Sources

The Observatory monitors the following central banking and financial-sector
sources. Each is collected via its native mechanism (RSS, REST API, or
HTML relay) and normalized into the same publication schema.

---

## Built-in Sources (defined in code)

### 1. Bank for International Settlements (BIS)

- **Method:** RSS
- **Feed URLs:**
  - `https://www.bis.org/doclist/all_pressrels.rss` — press releases
  - `https://www.bis.org/doclist/cbspeeches.rss` — central bank speeches
  - `https://www.bis.org/doclist/mgmtspeeches.rss` — BIS management speeches
- **Coverage:** BIS bulletins, speeches, press releases, BCBS publications
- **Collector:** `backend/app/collectors/bis.py`
- **Approx publications per run:** 60–75

### 2. International Monetary Fund (IMF)

- **Method:** RSS relay (IMF blocks direct RSS/SDMX access to publications)
- **Feed URL:** `https://rss-parrot.net/web/feeds/www.imf.org.en.publications`
- **Coverage:** IMF country reports, working papers, technical assistance reports
- **Collector:** `backend/app/collectors/imf.py`
- **Approx publications per run:** 10–15
- **Notes:** The relay is a third-party bridge. If it goes down, this source
  returns 0 publications (collected independently — no impact on others).

### 3. World Bank

- **Method:** REST API (Documents & Reports v3)
- **API URL:** `https://search.worldbank.org/api/v3/wds`
- **Queries:** One query per topic category (11 total) using the topic's primary keyword
- **Coverage:** World Bank reports, working papers, policy research
- **Collector:** `backend/app/collectors/worldbank.py`
- **Approx publications per run:** 50–60

### 4. Central Bank of Kenya (CBK)

- **Method:** RSS (WordPress feed)
- **Feed URL:** `https://www.centralbank.go.ke/feed/`
- **Coverage:** CBK guidelines, circulars, press releases, survey reports
- **Collector:** `backend/app/collectors/cbk.py`
- **Approx publications per run:** 10
- **Notes:** Serves as the "peer central bank" reference in the prototype.

---

## User-Added Sources (dynamic, via Admin Panel)

Any **RSS 2.0 or Atom** feed can be added through **Admin → Manage Sources**.
The URL is tested before saving — invalid feeds are rejected.

### Verified example

- **European Central Bank (ECB)** — `https://www.ecb.europa.eu/rss/press.html`
- **Federal Reserve** — `https://www.federalreserve.gov/feeds/press_all.xml`

### How it works

1. Admin enters a name + RSS URL
2. Backend fetches the URL with `feedparser`, validates that entries exist
3. Source is stored in the `sources` table
4. Every collection run iterates over active user sources in addition to the built-ins
5. Publications flow through the same AI pipeline and appear in all analyst views

### Deleting a source

Deleting a source from the admin panel **does not delete its previously
collected publications**. Those publications remain in the corpus and are
flagged as **orphaned** on the Dashboard.

This is intentional — historical data remains traceable to its origin.
To fully remove a source's content, use **Admin → Manage Publications → Hide**.

---

## Source Validation

Every URL is:
1. Fetched with a **10-second timeout**
2. Parsed with `feedparser`
3. Rejected if `feed.entries` is empty
4. Rejected if the URL is already registered

Duplicate publications are prevented at storage time by a SHA-256 fingerprint
of `institution|source_url|title`.

---

## Adding a New Built-in Source

To add a source as a hardcoded collector (not dynamic):

1. Create `backend/app/collectors/<name>.py` subclassing `BaseCollector`
2. Implement `fetch() -> list[Publication]`
3. Add the collector instance to `BUILTIN_COLLECTORS` in `scheduler.py`
4. Restart the backend

For most central bank feeds, use the dynamic RSS path instead — no code change needed.

---

## Known Limitations

| Source | Issue | Mitigation |
|---|---|---|
| IMF | Direct RSS blocked by Cloudflare | Third-party relay used |
| IMF | Relay is best-effort | Fails silently, no impact on other sources |
| World Bank | Returns mixed document types (loan agreements, etc.) | Filter by keyword; user can hide off-topic pubs |
| Any | Sites change feed URLs occasionally | Add via admin panel with a new URL |
