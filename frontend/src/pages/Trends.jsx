/**
 * Trends.jsx — Emerging topic trends.
 *
 * PURPOSE:
 *   Show which topics are rising or falling, based on the difference
 *   between recent and prior publication counts.
 *
 * USED BY:
 *   - App.jsx (when nav = "trends")
 */

import { useEffect, useState } from "react";
import TopicBars from "../components/TopicBars";
import { getTrends, getEmerging } from "../api";

export default function Trends() {
  const [topics, setTopics] = useState([]);
  const [emerging, setEmerging] = useState([]);

  useEffect(() => {
    getTrends().then(setTopics);
    getEmerging(3, 8).then(setEmerging);
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Emerging Trends</h1>

      <div className="emerging-list">
        <h3 className="chart-title">Top emerging topics (last 3 months vs prior)</h3>
        {emerging.map((e) => (
          <div key={e.topic} className="emerging-row">
            <span className="emerging-topic">{e.topic.replace(/_/g, " ")}</span>
            <span className="emerging-score">+{e.score}</span>
            <span className="emerging-meta">
              recent {e.recent} · prior {e.prior}
            </span>
          </div>
        ))}
      </div>

      <TopicBars data={topics} />
    </div>
  );
}
