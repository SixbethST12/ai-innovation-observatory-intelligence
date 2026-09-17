/**
 * Trends.tsx — Trend analysis with insights, timeline, and growth charts.
 *
 * FEATURES:
 *   - Working date-range filter (3m / 6m / 12m)
 *   - Multi-color line chart per topic (with legend toggle)
 *   - Auto-generated Insights card (bullets + AI narrative)
 *   - Emerging trends list + growth rate bars
 *   - Topic distribution (horizontal bars)
 */
import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp, Flame, FileText, Target, Lightbulb, Sparkles, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  getTrends, getEmerging, getTrendTimeline, getInsights,
  type TopicCount, type EmergingTopic, type InsightsData,
} from "@/lib/api";

// Distinct color per topic — used in line chart and distribution
const TOPIC_COLORS: Record<string, string> = {
  monetary_policy:         "#1e40af",  // navy blue
  financial_stability:     "#16a34a",  // green
  banking_regulation:      "#7c3aed",  // purple
  financial_markets:       "#0d9488",  // teal
  digital_finance:         "#c8a04a",  // gold
  fintech:                 "#dc2626",  // red
  artificial_intelligence: "#0891b2",  // cyan
  payment_systems:         "#9333ea",  // violet
  cybersecurity:           "#b45309",  // amber
  climate_finance:         "#15803d",  // dark green
  financial_inclusion:     "#be185d",  // pink
};

const FALLBACK_COLORS = ["#1e40af", "#7c3aed", "#0d9488", "#c8a04a", "#16a34a", "#dc2626"];

export default function Trends() {
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [emerging, setEmerging] = useState<EmergingTopic[]>([]);
  const [topicTimeline, setTopicTimeline] = useState<Record<string, Record<string, number>>>({});
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [range, setRange] = useState<"3m" | "6m" | "12m">("12m");
  const [loading, setLoading] = useState(true);

  // Fast data
  useEffect(() => {
    Promise.all([
      getTrends(),
      getEmerging(3, 6),
      getTrendTimeline(),
    ])
      .then(([t, e, ttl]) => {
        setTopics(t);
        setEmerging(e);
        setTopicTimeline(ttl);
      })
      .finally(() => setLoading(false));
  }, []);

  // Insights — separate (LLM, takes time)
  useEffect(() => {
    setInsightsLoading(true);
    getInsights(3)
      .then(setInsights)
      .catch((err) => console.warn("Insights failed:", err))
      .finally(() => setInsightsLoading(false));
  }, []);

  // Build multi-line chart data from topicTimeline
  const lineChartData = useMemo(() => {
    const months = new Set<string>();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (range === "3m" ? 3 : range === "6m" ? 6 : 12));

    const topSlugs = topics.slice(0, 6).map(t => t.topic);
    topSlugs.forEach(slug => {
      Object.keys(topicTimeline[slug] || {}).forEach(m => {
        const d = new Date(m + "-01");
        if (d >= cutoff) months.add(m);
      });
    });

    return [...months].sort().map(month => {
      const row: Record<string, string | number> = {
        month,
        label: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short", year: "2-digit",
        }),
      };
      topSlugs.forEach(slug => {
        row[slug] = topicTimeline[slug]?.[month] || 0;
      });
      return row;
    });
  }, [topicTimeline, topics, range]);

  const lineTopics = useMemo(() => topics.slice(0, 6).map(t => t.topic), [topics]);

  // Growth rate calc
  const growthRates = useMemo(() => {
    return emerging.map(e => ({
      topic: e.topic.replace(/_/g, " "),
      slug: e.topic,
      rate: e.prior === 0 ? 100 : Math.round(((e.recent - e.prior) / Math.max(e.prior, 1)) * 100),
    })).slice(0, 6);
  }, [emerging]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading trends…</div>;

  const fastestGrowing = emerging[0];
  const totalAnalyzed = topics.reduce((s, t) => s + t.count, 0);
  const highGrowth = growthRates.filter(g => g.rate > 50).length;

  return (
    <div>
      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Trends &amp; Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track emerging trends, analyze topic dynamics, and identify key developments
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as any)}
          className="bg-white border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--bot-navy)] hover:border-[var(--bot-gold)] transition cursor-pointer"
        >
          <option value="3m">Last 3 months</option>
          <option value="6m">Last 6 months</option>
          <option value="12m">Last 12 months</option>
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatCard icon={TrendingUp} label="Emerging Trends" value={emerging.length} sub="Detected in last 3 months" tone="blue" />
        <StatCard icon={Flame} label="Fastest Growing" value={fastestGrowing?.score || 0}
          sub={fastestGrowing ? fastestGrowing.topic.replace(/_/g, " ") : "—"} tone="red" />
        <StatCard icon={FileText} label="Publications Analyzed" value={totalAnalyzed} sub="Topic mentions" tone="gold" />
        <StatCard icon={Target} label="High-Growth Topics" value={highGrowth} sub="Above 50% growth" tone="green" />
      </div>

      {/* Row 1 — Line chart + Insights */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-5 mb-6">
        {/* Multi-line chart */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--bot-gold-dark)]" />
              Trend of Key Topics Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {lineChartData.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">No timeline data for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={lineChartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                  <defs>
                    {lineTopics.map(slug => (
                      <linearGradient key={slug} id={`grad-${slug}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TOPIC_COLORS[slug] || "#1e40af"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={TOPIC_COLORS[slug] || "#1e40af"} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10, border: "1px solid #e2e8f0",
                      fontSize: 12, fontWeight: 600,
                      boxShadow: "0 4px 12px rgba(30,58,138,.1)",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }}
                    formatter={(value: string) => value.replace(/_/g, " ")}
                  />
                  {lineTopics.map(slug => (
                    <Line
                      key={slug}
                      type="monotone"
                      dataKey={slug}
                      stroke={TOPIC_COLORS[slug] || "#1e40af"}
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      name={slug}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Insights card */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Lightbulb size={16} className="text-[var(--bot-gold-dark)]" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {insightsLoading ? (
              <div className="text-sm text-gray-500 py-8 text-center">
                Generating insights… (30–60s)
              </div>
            ) : insights ? (
              <div className="space-y-4">
                {/* Bullets */}
                <ul className="space-y-2.5">
                  {insights.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-[12.5px] text-gray-700 leading-relaxed">
                      <span className="text-[var(--bot-gold)] font-extrabold flex-shrink-0">▸</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* AI narrative */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                    <Sparkles size={12} className="text-[var(--bot-navy)]" />
                    AI Brief
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[12.5px] text-[var(--bot-navy)] leading-relaxed">
                    {insights.narrative}
                  </div>
                </div>

                <Badge className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] border border-[#e0c57f] hover:bg-[var(--bot-gold-soft)] text-[10.5px] font-bold">
                  {insights.disclaimer}
                </Badge>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-8 text-center">
                Insights unavailable.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Emerging list + Growth rate */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Emerging trends list */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Flame size={16} className="text-red-500" />
              Emerging Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emerging.map((e, i) => (
                <div
                  key={e.topic}
                  className="flex gap-3 items-center p-3 rounded-lg hover:bg-[var(--bot-gold-soft)] transition-all hover:translate-x-1"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--bot-navy)] text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-[var(--bot-navy)] capitalize truncate">
                      {e.topic.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      recent <strong>{e.recent}</strong> · prior <strong>{e.prior}</strong>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 font-extrabold">
                    +{e.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Growth rate bars */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Target size={16} className="text-[var(--bot-navy)]" />
              Topic Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthRates} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis
                  type="category"
                  dataKey="topic"
                  width={130}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#1e3a8a" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }}
                  formatter={(v: number) => [`${v}%`, "Growth"]}
                />
                <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={18}>
                  {growthRates.map((g) => (
                    <Cell key={g.slug} fill={TOPIC_COLORS[g.slug] || "#1e40af"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Topic distribution */}
      <Card className="transition-all hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
            <Info size={16} className="text-[var(--bot-gold-dark)]" />
            Topic Distribution Across the Corpus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topics.map((t) => {
              const max = topics[0]?.count || 1;
              const pct = Math.round((t.count / max) * 100);
              const color = TOPIC_COLORS[t.topic] || FALLBACK_COLORS[0];
              return (
                <div key={t.topic} className="group">
                  <div className="flex justify-between items-center mb-1.5 text-[12.5px]">
                    <span className="font-bold text-[var(--bot-navy)] capitalize flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
                        style={{ background: color }}
                      />
                      {t.topic.replace(/_/g, " ")}
                    </span>
                    <span className="text-gray-600 font-extrabold">{t.count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 group-hover:brightness-110"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  sub: string;
  tone: "gold" | "blue" | "green" | "purple" | "red";
}) {
  const tones = {
    gold:   { bg: "bg-[var(--bot-gold-soft)]", text: "text-[var(--bot-gold-dark)]", accent: "from-[var(--bot-gold)] to-[var(--bot-gold-dark)]" },
    blue:   { bg: "bg-blue-50",    text: "text-blue-700",    accent: "from-blue-500 to-blue-700" },
    green:  { bg: "bg-green-50",   text: "text-green-700",   accent: "from-green-500 to-green-700" },
    purple: { bg: "bg-purple-50",  text: "text-purple-700",  accent: "from-purple-500 to-purple-700" },
    red:    { bg: "bg-red-50",     text: "text-red-700",     accent: "from-red-500 to-red-700" },
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
          <div className="text-[28px] font-extrabold text-[var(--bot-navy)] leading-none mt-1.5 tracking-tight">
            {value}
          </div>
          <div className="text-[11px] text-green-600 font-bold mt-1.5 truncate">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
