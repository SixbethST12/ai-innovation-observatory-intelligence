/**
 * Trends.tsx — Trend analysis and emerging topics.
 */
import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp, Flame, FileText, Target, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  getTrends, getEmerging, getTimeline, getInstitutions, getTrendTimeline,
  type TopicCount, type EmergingTopic, type InstitutionCount,
} from "@/lib/api";

const COLORS = ["#1e40af", "#7c3aed", "#0d9488", "#c8a04a", "#16a34a", "#94a3b8"];

const TOPIC_LINE_COLORS: Record<string, string> = {
  monetary_policy: "#1e40af",
  financial_stability: "#16a34a",
  fintech: "#c8a04a",
  digital_finance: "#7c3aed",
  cybersecurity: "#dc2626",
  payment_systems: "#0d9488",
};

export default function Trends() {
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [emerging, setEmerging] = useState<EmergingTopic[]>([]);
  const [timeline, setTimeline] = useState<{ month: string; count: number }[]>([]);
  const [topicTimeline, setTopicTimeline] = useState<Record<string, Record<string, number>>>({});
  const [institutions, setInstitutions] = useState<InstitutionCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTrends(),
      getEmerging(3, 6),
      getTimeline(),
      getTrendTimeline(),
      getInstitutions(),
    ])
      .then(([t, e, tl, ttl, inst]) => {
        setTopics(t);
        setEmerging(e);
        setTimeline(tl);
        setTopicTimeline(ttl);
        setInstitutions(inst);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter timeline to last 12 months only (drop old 1977 entries)
  const recentTimeline = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    return timeline
      .filter(t => new Date(t.month + "-01") >= cutoff)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [timeline]);

  // Build multi-line chart data from topicTimeline (top 6 topics, last 12 months)
  const lineChartData = useMemo(() => {
    // Only include topics with meaningful volume (top 4 with count >= 3)
    const topTopicSlugs = topics
      .filter(t => t.count >= 3)
      .slice(0, 4)
      .map(t => t.topic);
    const months = recentTimeline.map(t => t.month);
    return months.map(month => {
      const row: Record<string, string | number> = { month };
      topTopicSlugs.forEach(slug => {
        row[slug] = topicTimeline[slug]?.[month] || 0;
      });
      return row;
    });
  }, [topics, topicTimeline, recentTimeline]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading trends…</div>;

  const fastestGrowing = emerging[0];
  const totalAnalyzed = topics.reduce((s, t) => s + t.count, 0);

  // Growth rate calculation
  const growthRates = emerging.map(e => ({
    topic: e.topic.replace(/_/g, " "),
    rate: e.prior === 0 ? 100 : Math.round(((e.recent - e.prior) / Math.max(e.prior, 1)) * 100),
  })).slice(0, 6);

  return (
    <div>
      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Trend Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track emerging trends, analyze topic dynamics, and identify key developments
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatCard icon={TrendingUp} label="Emerging Trends" value={emerging.length} sub="Detected in last 3 months" />
        <StatCard icon={Flame} label="Fastest Growing" value={fastestGrowing ? fastestGrowing.score : 0}
          sub={fastestGrowing ? fastestGrowing.topic.replace(/_/g, " ") : "—"} />
        <StatCard icon={FileText} label="Publications Analyzed" value={totalAnalyzed} sub="Topic mentions" />
        <StatCard icon={Target} label="High-Growth Topics" value={growthRates.filter(g => g.rate > 50).length} sub="Above 50% growth" />
      </div>

      {/* Row 2 — Line chart + Emerging list */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-5 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">
              Trend of Key Topics Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={lineChartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                {topics
                  .filter(t => t.count >= 3)
                  .slice(0, 4)
                  .map(t => (
                    <Line
                      key={t.topic}
                      type="monotone"
                      dataKey={t.topic}
                      stroke={TOPIC_LINE_COLORS[t.topic] || "#1e40af"}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={t.topic.replace(/_/g, " ")}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Emerging Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emerging.map((e, i) => (
                <div key={e.topic} className="flex gap-3 items-start p-3 rounded-lg hover:bg-[var(--bot-gold-soft)]">
                  <div className="w-7 h-7 rounded-full bg-[var(--bot-navy)] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-[var(--bot-navy)] capitalize truncate">
                      {e.topic.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {e.recent} recent · {e.prior} prior
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 font-bold">
                    +{e.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Growth rate + Publication timeline */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Topic Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={growthRates} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="topic" width={130} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="rate" fill="#1e40af" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Publication Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={recentTimeline} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#c8a04a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Topic distribution + Source distribution */}
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Topic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topics.map(t => {
                const max = topics[0]?.count || 1;
                const pct = Math.round((t.count / max) * 100);
                return (
                  <div key={t.topic} className="grid grid-cols-[140px_1fr_50px] gap-3 items-center text-xs">
                    <span className="capitalize text-gray-700 font-semibold truncate">
                      {t.topic.replace(/_/g, " ")}
                    </span>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--bot-navy)] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-right font-bold text-[var(--bot-navy)]">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={institutions}
                  dataKey="count"
                  nameKey="institution"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  label={(entry) => `${entry.institution}: ${entry.count}`}
                  labelLine={false}
                >
                  {institutions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
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
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-semibold">{label}</div>
          <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1 truncate">
            {value}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 truncate">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
