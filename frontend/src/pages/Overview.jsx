/**
 * Overview.jsx — Dashboard landing page.
 *
 * PURPOSE:
 *   Show top-line stats, topic distribution, institution split, and a
 *   chronological publication timeline.
 *
 * USED BY:
 *   - App.jsx (when nav = "overview")
 */

import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import TopicBars from "../components/TopicBars";
import InstitutionChart from "../components/InstitutionChart";
import Timeline from "../components/Timeline";
import { getStats, getTrends, getInstitutions, getPublications } from "../api";

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats(),
      getTrends(),
      getInstitutions(),
      getPublications({ limit: 8 }),
    ])
      .then(([s, t, i, r]) => {
        setStats(s);
        setTopics(t);
        setInstitutions(i);
        setRecent(r);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build a rough monthly timeline from recent pubs
  const timeline = Object.entries(
    recent.reduce((acc, p) => {
      if (!p.published_date) return acc;
      const m = p.published_date.slice(0, 7);
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <div className="page">
      <h1 className="page-title">Intelligence Overview</h1>

      <div className="stat-grid">
        <StatCard icon="FileText" label="Publications" value={stats?.total_publications ?? 0} />
        <StatCard icon="Sparkles" label="AI processed" value={stats?.total_processed ?? 0} />
        <StatCard icon="Building2" label="Sources" value={stats?.total_institutions ?? 0} />
        <StatCard icon="Tags" label="Topics" value={stats?.total_topics ?? 0} />
      </div>

      <div className="grid-2">
        <TopicBars data={topics} />
        <InstitutionChart data={institutions} />
      </div>

      <Timeline data={timeline} />
    </div>
  );
}
