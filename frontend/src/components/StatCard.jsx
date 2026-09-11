/**
 * StatCard.jsx — Small summary card for the Overview page.
 *
 * PURPOSE:
 *   Display one metric (label + big number + optional subtitle).
 *
 * USED BY:
 *   - pages/Overview.jsx
 */

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";

export default function StatCard({ icon = "BarChart3", label, value, subtitle }) {
  const Icon = Icons[icon] || Icons.BarChart3;
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon size={22} /></div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
