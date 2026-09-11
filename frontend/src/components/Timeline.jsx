/**
 * Timeline.jsx — Publication counts over time (by month).
 *
 * PURPOSE:
 *   Show how publication volume changes month over month, so analysts
 *   can spot surges in activity.
 *
 * USED BY:
 *   - pages/Overview.jsx
 *
 * NOTES:
 *   Expects data shaped as [{ month: "2026-09", count: 12 }, ...].
 */

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function Timeline({ data = [] }) {
  return (
    <div className="chart-box">
      <h3 className="chart-title">Publication timeline</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
          <XAxis dataKey="month" stroke="#9aa4b2" tick={{ fontSize: 12 }} />
          <YAxis stroke="#9aa4b2" />
          <Tooltip
            contentStyle={{ background: "#111826", border: "1px solid #2a2f3a" }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#7ed957"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
