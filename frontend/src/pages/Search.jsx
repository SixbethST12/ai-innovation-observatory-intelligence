/**
 * Search.jsx — Keyword search across the corpus.
 *
 * PURPOSE:
 *   Let analysts search titles, abstracts, and AI summaries.
 *
 * USED BY:
 *   - App.jsx (when nav = "search")
 */

import { useState } from "react";
import PublicationCard from "../components/PublicationCard";
import { searchPublications } from "../api";

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchPublications(q, { limit: 50 });
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Search</h1>

      <form className="search-bar" onSubmit={run}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles, abstracts, and AI summaries…"
        />
        <button type="submit">Search</button>
      </form>

      {loading && <div className="loading">Searching…</div>}

      {results && (
        <>
          <div className="search-meta">
            {results.count} result{results.count === 1 ? "" : "s"} for “{results.query}”
          </div>
          <div className="pub-list">
            {results.results.map((p) => <PublicationCard key={p.id} pub={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
