/**
 * InstitutionChart.jsx — Donut chart of publications per source.
 *
 * PURPOSE:
 *   Show the share of publications coming from each institution.
 *
 * USED BY:
 *   - pages/Overview.jsx
 */

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#4ea1ff", "#7ed957", "#ffb84d", "#ff6b6b", "#b98bff"];

export default function InstitutionChart({ data = [] }) {
  return (
    <div className="chart-box">
      <h3 className="chart-title">Publications by institution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="institution"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#111826", border: "1px solid #2a2f3a" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
