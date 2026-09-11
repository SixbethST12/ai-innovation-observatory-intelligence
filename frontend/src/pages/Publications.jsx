/**
 * Publications.jsx — List and filter stored publications.
 *
 * PURPOSE:
 *   Browse the full publication corpus with filters for institution
 *   and topic.
 *
 * USED BY:
 *   - App.jsx (when nav = "publications")
 */

import { useEffect, useState } from "react";
import PublicationCard from "../components/PublicationCard";
import { getPublications } from "../api";

const INSTITUTIONS = ["", "BIS", "IMF", "World Bank", "CBK"];

export default function Publications() {
  const [pubs, setPubs] = useState([]);
  const [institution, setInstitution] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 100 };
    if (institution) params.institution = institution;
    if (topic) params.topic = topic;
    getPublications(params)
      .then(setPubs)
      .finally(() => setLoading(false));
  }, [institution, topic]);

  return (
    <div className="page">
      <h1 className="page-title">Publications</h1>

      <div className="filters">
        <select value={institution} onChange={(e) => setInstitution(e.target.value)}>
          {INSTITUTIONS.map((i) => (
            <option key={i} value={i}>{i || "All institutions"}</option>
          ))}
        </select>
        <input
          placeholder="Filter by topic slug (e.g. fintech)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="pub-list">
          {pubs.map((p) => <PublicationCard key={p.id} pub={p} />)}
          {pubs.length === 0 && <div className="empty">No publications match.</div>}
        </div>
      )}
    </div>
  );
}
