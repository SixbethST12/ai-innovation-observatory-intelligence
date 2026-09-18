/**
 * Dashboard.tsx — Main intelligence dashboard.
 */
import { useEffect, useState } from "react";
import {
  FileText, Building2, TrendingUp, Sparkles, ArrowRight,
  Calendar, AlertCircle, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  getStats, getTrends, getInstitutions, getEmerging,
  getPublications, getTimeline, getGlance, getAlerts,
  type Stats, type TopicCount, type InstitutionCount,
  type EmergingTopic, type Publication, type GlanceData, type SystemAlert,
} from "@/lib/api";

const COLORS = ["#1e40af", "#7c3aed", "#0d9488", "#c8a04a", "#16a34a", "#94a3b8"];
const SUBJECT_COLORS = ["#1e40af", "#7c3aed", "#0d9488", "#c8a04a", "#16a34a", "#dc2626"];

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
  const [allPubs, setAllPubs] = useState<Publication[]>([]);
  const [timeline, setTimeline] = useState<{ month: string; count: number }[]>([]);
  const [glance, setGlance] = useState<GlanceData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("90d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fast calls first — unblock the page
    Promise.all([
      getStats(),
      getTrends(),
      getInstitutions(),
      getEmerging(3, 6),
      getPublications({ limit: 300 }),
      getTimeline(),
      getAlerts().catch(() => []),
    ])
      .then(([s, t, i, e, pubs, tl, al]) => {
        setStats(s);
        setTopics(t);
        setInstitutions(i);
        setEmerging(e);
        setAllPubs(pubs);
        setRecent(pubs.slice(0, 6));
        setTimeline(tl);
        setAlerts(al);
        setLoading(false);
      });

    // Glance is slow (LLM) — load independently
    getGlance().then(setGlance).catch(() => {});
  }, []);

  // Time filter — recompute `recent` when range changes
  useEffect(() => {
    if (!allPubs.length) return;
    if (range === "all") {
      setRecent(allPubs.slice(0, 6));
      return;
    }
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    const filtered = allPubs
      .filter(p => p.published_date && new Date(p.published_date).getTime() >= cutoff)
      .sort((a, b) => (b.published_date || "").localeCompare(a.published_date || ""));
    setRecent(filtered.slice(0, 6));
  }, [range, allPubs]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading dashboard…</div>;

  const total = institutions.reduce((s, d) => s + d.count, 0);

  // High-relevance pubs — score by topic count + recency
  const highRelevance = [...allPubs]
    .filter(p => p.ai_processed && p.ai_topics)
    .sort((a, b) => {
      const aScore = (a.ai_topics?.split(",").length || 0) * 10 +
                     (a.published_date ? new Date(a.published_date).getTime() / 1e10 : 0);
      const bScore = (b.ai_topics?.split(",").length || 0) * 10 +
                     (b.published_date ? new Date(b.published_date).getTime() / 1e10 : 0);
      return bScore - aScore;
    })
    .slice(0, 3);

  const recentTimeline = (() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    return timeline
      .filter(t => new Date(t.month + "-01") >= cutoff)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((t) => ({
        ...t,
        label: new Date(t.month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
      }));
  })();

  // Only show critical/high alerts in the banner
  const importantAlerts = alerts.filter(a => a.level === "critical" || a.level === "high" || a.level === "medium");

  return (
    <div>
      {/* Alert banner */}
      {!alertDismissed && importantAlerts.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-amber-900">
              {importantAlerts[0].title}
            </div>
            <div className="text-xs text-amber-800 mt-0.5">
              {importantAlerts[0].message}
            </div>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-amber-600 hover:text-amber-900 p-1"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Key insights from global central banking and financial sector developments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={14} />
            Last updated:{" "}
            {new Date().toLocaleString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="bg-white border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--bot-navy)] hover:border-[var(--bot-gold)] transition cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatCard
          icon={FileText}
          label="Total Publications"
          value={stats?.total_publications ?? 0}
          tone="gold"
        />
        <StatCard
          icon={Building2}
          label="Sources Monitored"
          value={stats?.total_institutions ?? 0}
          tone="blue"
          warning={
            (stats?.orphaned_institutions?.length ?? 0) > 0
              ? `+${stats!.orphaned_institutions.length} orphaned (${stats!.orphaned_institutions.join(", ")})`
              : undefined
          }
        />
        <StatCard
          icon={TrendingUp}
          label="Emerging Trends"
          value={emerging.length}
          tone="green"
        />
        <StatCard
          icon={Sparkles}
          label="AI Processed"
          value={stats?.total_processed ?? 0}
          tone="purple"
        />
      </div>

      {/* Row 2 — Source | Subjects | Emerging */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Source Distribution */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
              Source Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[55%_1fr] gap-3 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={institutions} dataKey="count" nameKey="institution"
                       innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {institutions.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div className="text-2xl font-extrabold text-[var(--bot-navy)]">{total}</div>
                <div className="text-xs text-gray-500 mb-3 font-semibold">Total</div>
                {institutions.map((d, i) => {
                  const pct = total ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.institution}
                         className="grid grid-cols-[10px_1fr_auto_auto] gap-2 items-center text-xs py-1 rounded transition hover:bg-[var(--bot-gold-soft)] px-1">
                      <span className="w-2.5 h-2.5 rounded-full"
                            style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-bold text-gray-700 text-[11.5px] leading-tight">
                        {d.institution}
                      </span>
                      <span className="text-gray-500 font-semibold">{pct}%</span>
                      <span className="font-extrabold text-[var(--bot-navy)] min-w-[28px] text-right">
                        {d.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frequently Discussed Subjects */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
              Frequently Discussed Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topics.slice(0, 6).map((t, i) => {
                const max = topics[0]?.count || 1;
                const pct = Math.round((t.count / max) * 100);
                const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                return (
                  <div key={t.topic} className="group">
                    <div className="flex justify-between items-center mb-1.5 text-[12.5px]">
                      <span className="font-bold text-[var(--bot-navy)] capitalize flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
                              style={{ background: color }} />
                        {t.topic.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-600 font-bold">{t.count} pubs</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 group-hover:brightness-110"
                           style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Emerging Trends */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
              Emerging Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {emerging.map(e => (
                <div key={e.topic}
                     className="grid grid-cols-[36px_1fr_auto] gap-3 items-center py-2 px-2 rounded-lg transition-all hover:bg-[var(--bot-gold-soft)] hover:translate-x-0.5 cursor-default">
                  <div className="w-9 h-9 rounded-lg bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[var(--bot-navy)] capitalize truncate">
                      {e.topic.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      recent <strong>{e.recent}</strong> · prior <strong>{e.prior}</strong>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap transition hover:bg-green-200">
                    +{e.score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Publication timeline */}
      <Card className="mb-6 overflow-hidden transition-all duration-200 hover:shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[var(--bot-gold-soft)] to-white border-b border-[#f0e8d0]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Calendar size={16} className="text-[var(--bot-gold-dark)]" />
              Publication Timeline — last 12 months
            </CardTitle>
            <span className="text-[11px] text-[var(--bot-gold-dark)] font-bold uppercase tracking-wider">
              {recentTimeline.reduce((s, t) => s + t.count, 0)} pubs
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={recentTimeline} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8a04a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e8ce7a" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(30,58,138,.1)",
                }}
                cursor={{ fill: "rgba(200,160,74,.08)" }}
              />
              <Bar dataKey="count" fill="url(#timelineGradient)" radius={[8, 8, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 4 — Recent + Glance */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
              Recent Publications
            </CardTitle>
            <a href="#" className="text-xs text-[var(--bot-navy)] font-bold hover:underline">
              View all →
            </a>
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
                    <tr key={p.id}
                        className="border-t border-gray-100 transition-colors hover:bg-[var(--bot-gold-soft)]">
                      <td className="py-3 pr-2">
                        <a href={p.source_url} target="_blank" rel="noreferrer"
                           className="font-bold text-[var(--bot-navy)] hover:text-blue-600 line-clamp-2">
                          {p.title.length > 60 ? p.title.slice(0, 60) + "…" : p.title}
                        </a>
                      </td>
                      <td className="py-3 pr-2">
                        <span className="font-extrabold text-[#1e40af]">{p.institution}</span>
                      </td>
                      <td className="py-3 pr-2 text-gray-500 whitespace-nowrap font-semibold">
                        {p.published_date
                          ? new Date(p.published_date).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${relClass}`}>
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
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
              Intelligence at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {glance ? (
              <>
                <div className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-[var(--bot-navy)] text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div className="text-[12.5px] text-[var(--bot-navy)] leading-relaxed">
                    {glance.narrative}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                    Top emerging topics
                  </div>
                  <div className="space-y-2">
                    {glance.topics.map(t => (
                      <div key={t.topic}
                           className="flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-[var(--bot-gold-soft)] hover:translate-x-0.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-[var(--bot-navy)] capitalize truncate">
                            {t.topic.replace(/_/g, " ")}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            recent <strong>{t.recent}</strong> · prior <strong>{t.prior}</strong>
                          </div>
                        </div>
                        <span className="bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap">
                          +{t.score}
                        </span>
                        <button
                          onClick={() =>
                            window.dispatchEvent(new CustomEvent("navigate", {
                              detail: { page: "publications", topic: t.topic },
                            }))
                          }
                          className="text-[11px] font-bold text-[var(--bot-navy)] hover:text-blue-600 border border-[#e0d6bf] hover:border-blue-300 hover:bg-blue-50 rounded-full px-2.5 py-1 transition"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <Badge className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] border border-[#e0c57f] hover:bg-[var(--bot-gold-soft)] text-[10.5px] font-bold">
                  {glance.disclaimer}
                </Badge>
              </>
            ) : (
              <div className="text-sm text-gray-500 py-8 text-center">
                Loading intelligence brief… (may take 30s)
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5 — High-Relevance Publications */}
      <Card className="transition-all duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
            ⭐ High-Relevance Publications
          </CardTitle>
          <span className="text-[11px] text-gray-500 font-semibold">
            Ranked by topic coverage and recency
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {highRelevance.map(p => (
              <div key={p.id}
                   className="grid grid-cols-[1fr_auto_auto] gap-4 items-center p-4 rounded-lg border border-gray-100 transition-all hover:border-[var(--bot-gold)] hover:bg-[var(--bot-gold-soft)] hover:shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="outline"
                           className="border-blue-200 bg-blue-50 text-blue-700 font-bold text-[10.5px]">
                      {p.institution}
                    </Badge>
                    <span className="text-[11px] text-gray-500 font-semibold">
                      {p.published_date
                        ? new Date(p.published_date).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"}
                    </span>
                    <span className="text-[10.5px] font-extrabold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                      HIGH
                    </span>
                  </div>
                  <a href={p.source_url} target="_blank" rel="noreferrer"
                     className="text-[14px] font-bold text-[var(--bot-navy)] hover:text-blue-600 leading-snug block">
                    {p.title}
                  </a>
                  {p.ai_topics && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {p.ai_topics.split(",").slice(0, 3).map(t => (
                        <span key={t}
                              className="text-[10.5px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-bold capitalize">
                          {t.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <a href={p.source_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="whitespace-nowrap">
                    Open <ArrowRight size={12} />
                  </Button>
                </a>
              </div>
            ))}
            {highRelevance.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No processed publications yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, warning,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  tone: "gold" | "blue" | "green" | "purple";
  warning?: string;
}) {
  const tones = {
    gold:   { bg: "bg-[var(--bot-gold-soft)]",  text: "text-[var(--bot-gold-dark)]", accent: "from-[var(--bot-gold)] to-[var(--bot-gold-dark)]" },
    blue:   { bg: "bg-blue-50",                 text: "text-blue-700",                accent: "from-blue-500 to-blue-700" },
    green:  { bg: "bg-green-50",                text: "text-green-700",               accent: "from-green-500 to-green-700" },
    purple: { bg: "bg-purple-50",               text: "text-purple-700",              accent: "from-purple-500 to-purple-700" },
  }[tone];

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tones.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`${tones.bg} ${tones.text} p-3 rounded-lg transition-transform group-hover:scale-110`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{label}</div>
          <div className="text-[30px] font-extrabold text-[var(--bot-navy)] leading-none mt-1.5 tracking-tight">
            {value}
          </div>
          {warning && (
            <div className="text-[10.5px] text-amber-600 font-bold mt-1.5 leading-tight">
              ⚠ {warning}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
