/**
 * Dashboard.tsx — Main intelligence dashboard.
 */
import { useEffect, useState } from "react";
import { FileText, Building2, TrendingUp, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  getStats, getTrends, getInstitutions, getEmerging, getPublications, getTimeline,
  type Stats, type TopicCount, type InstitutionCount, type EmergingTopic, type Publication,
} from "@/lib/api";

const COLORS = ["#1e40af", "#7c3aed", "#0d9488", "#c8a04a", "#16a34a", "#94a3b8"];

// Per-topic palette for "Publications by topic" bars
const TOPIC_COLORS = [
  "#1e40af", "#7c3aed", "#0d9488", "#c8a04a",
  "#16a34a", "#dc2626", "#0891b2", "#9333ea",
  "#b45309", "#15803d", "#be185d",
];

function relevanceLevel(p: Publication): "high" | "medium" | "low" {
  const t = p.ai_topics ? p.ai_topics.split(",").filter(Boolean).length : 0;
  if (t >= 3) return "high";
  if (t >= 2) return "medium";
  return "low";
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionCount[]>([]);
  const [emerging, setEmerging] = useState<EmergingTopic[]>([]);
  const [recent, setRecent] = useState<Publication[]>([]);
  const [timeline, setTimeline] = useState<{ month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats(),
      getTrends(),
      getInstitutions(),
      getEmerging(3, 5),
      getPublications({ limit: 6 }),
      getTimeline(),
    ])
      .then(([s, t, i, e, r, tl]) => {
        setStats(s);
        setTopics(t);
        setInstitutions(i);
        setEmerging(e);
        setRecent(r);
        setTimeline(tl);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading dashboard…</div>;

  const total = institutions.reduce((s, d) => s + d.count, 0);
  const topicRows = topics.slice(0, 8).map(t => ({
    ...t,
    label: t.topic.replace(/_/g, " "),
  }));

  const topEmerging = emerging[0];

  // Keep only the last 12 months for a clean chart
  const recentTimeline = (() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    return timeline
      .filter(t => new Date(t.month + "-01") >= cutoff)
      .sort((a, b) => a.month.localeCompare(b.month));
  })();

  return (
    <div>
      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Key insights from global central banking and financial sector developments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={14} />
            Last updated: {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          <select className="bg-white border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm">
            <option>Last 7 days</option>
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatCard icon={FileText} label="Total Publications" value={stats?.total_publications ?? 0} sub="real data from 4 sources" />
        <StatCard icon={Building2} label="Sources Monitored" value={stats?.total_institutions ?? 0} sub="BIS, IMF, World Bank, CBK" />
        <StatCard icon={TrendingUp} label="Emerging Trends" value={emerging.length} sub="across last 3 months" />
        <StatCard icon={Sparkles} label="AI Processed" value={stats?.total_processed ?? 0} sub={`of ${stats?.total_publications ?? 0} publications`} />
      </div>

      {/* Row 2 — 3 charts */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Publications by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[55%_1fr] gap-3 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={institutions} dataKey="count" nameKey="institution" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {institutions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div className="text-2xl font-extrabold text-[var(--bot-navy)]">{total}</div>
                <div className="text-xs text-gray-500 mb-3">Total</div>
                {institutions.map((d, i) => {
                  const pct = total ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.institution} className="grid grid-cols-[10px_1fr_auto_auto] gap-2 items-center text-xs py-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-semibold text-gray-700 text-[11px] leading-tight">{d.institution}</span>
                      <span className="text-gray-400">{pct}%</span>
                      <span className="font-bold text-[var(--bot-navy)] min-w-[28px] text-right">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topic bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Publications by topic</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topicRows} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={120} stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 700, fill: "#1e3a8a" }} interval={0} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                  {topicRows.map((_, i) => (
                    <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emerging */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Emerging Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {emerging.map(e => (
                <div key={e.topic} className="grid grid-cols-[36px_1fr_auto] gap-3 items-center py-2 px-2 rounded-lg hover:bg-[var(--bot-gold-soft)]">
                  <div className="w-9 h-9 rounded-lg bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[var(--bot-navy)] capitalize truncate">
                      {e.topic.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      recent {e.recent} · prior {e.prior}
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap">
                    +{e.score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Publication timeline (full width) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)]">
            Publication Timeline — last 12 months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={recentTimeline} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#c8a04a" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 4 — Recent + Glance */}
      <div className="grid grid-cols-2 gap-5">
        {/* Recent publications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Recent Publications</CardTitle>
            <a href="#" className="text-xs text-[var(--bot-navy)] font-semibold hover:underline">View all →</a>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-gray-400">
                  <th className="text-left pb-2 font-bold w-[55%]">Title</th>
                  <th className="text-left pb-2 font-bold w-[15%]">Source</th>
                  <th className="text-left pb-2 font-bold w-[15%]">Date</th>
                  <th className="text-left pb-2 font-bold w-[15%]">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(p => {
                  const rel = relevanceLevel(p);
                  const relClass =
                    rel === "high" ? "bg-red-100 text-red-700"
                    : rel === "medium" ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700";
                  const relLabel = rel.charAt(0).toUpperCase() + rel.slice(1);
                  return (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="py-3 pr-2">
                        <a href={p.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--bot-navy)] hover:text-blue-600 line-clamp-2">
                          {p.title.length > 60 ? p.title.slice(0, 60) + "…" : p.title}
                        </a>
                      </td>
                      <td className="py-3 pr-2">
                        <span className="font-bold text-[#1e40af]">{p.institution}</span>
                      </td>
                      <td className="py-3 pr-2 text-gray-500 whitespace-nowrap">
                        {p.published_date ? new Date(p.published_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${relClass}`}>
                          {relLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Intelligence at a glance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Intelligence at a Glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="w-10 h-10 rounded-full bg-[var(--bot-navy)] text-white flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-[13px] text-[var(--bot-navy)] font-semibold">
                  <span className="capitalize">{topEmerging?.topic.replace(/_/g, " ") || "—"}</span> is the most active topic.
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {topEmerging
                    ? `${topEmerging.recent} publications in the last 3 months vs ${topEmerging.prior} in the prior period.`
                    : "No emerging topics detected."}
                </div>
              </div>
            </div>

            <Badge className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] border border-[#e0c57f] hover:bg-[var(--bot-gold-soft)]">
              AI-generated — not an official Bank of Tanzania position.
            </Badge>

            <Button className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)] text-white">
              View related publications <ArrowRight size={14} />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub,
}: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; sub: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] p-3 rounded-lg">
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-semibold">{label}</div>
          <div className="text-[28px] font-extrabold text-[var(--bot-navy)] leading-none mt-1">{value}</div>
          <div className="text-[11px] text-green-600 font-semibold mt-1.5">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
