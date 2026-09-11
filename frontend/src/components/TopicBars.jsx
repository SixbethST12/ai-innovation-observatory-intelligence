/**
 * TopicBars.jsx — Horizontal bar chart of topic frequencies.
 *
 * PURPOSE:
 *   Visualize how many publications mention each topic.
 *
 * USED BY:
 *   - pages/Overview.jsx
 *   - pages/Trends.jsx
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function TopicBars({ data = [] }) {
  const rows = data.map((d) => ({
    ...d,
    label: d.topic.replace(/_/g, " "),
  }));

  return (
    <div className="chart-box">
      <h3 className="chart-title">Publications by topic</h3>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={rows} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
          <XAxis type="number" stroke="#9aa4b2" />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            stroke="#9aa4b2"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: "#111826", border: "1px solid #2a2f3a" }}
          />
          <Bar dataKey="count" fill="#4ea1ff" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
