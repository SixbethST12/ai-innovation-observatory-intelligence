/**
 * KnowledgeBase.tsx — Browse the corpus by category, recent items, and insights.
 */
import { useEffect, useState, useMemo } from "react";
import {
  FileText, Building2, Tags, Link2, Database, TrendingUp,
  Sparkles, Search, Download, ArrowRight, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  getPublications, getTrends, getInstitutions, getEmerging,
  type Publication, type TopicCount, type InstitutionCount, type EmergingTopic,
} from "@/lib/api";

export default function KnowledgeBase() {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionCount[]>([]);
  const [emerging, setEmerging] = useState<EmergingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPublications({ limit: 500 }), getTrends(), getInstitutions(), getEmerging(3, 5)])
      .then(([p, t, i, e]) => {
        setPubs(p);
        setTopics(t);
        setInstitutions(i);
        setEmerging(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = pubs.length;
  const sources = institutions.length;
  const totalTopics = topics.length;

  const selectedPubs = useMemo(() => {
    if (!openCategory) return [];
    return pubs.filter(p => p.ai_topics?.split(",").includes(openCategory));
  }, [pubs, openCategory]);

  // Compute insights
  const topTopic = topics[0];
  const fastestGrowing = emerging[0];

  function exportCSV() {
    const headers = ["id", "institution", "title", "published_date", "ai_topics", "source_url"];
    const rows = pubs.map(p => [
      p.id, p.institution, `"${p.title.replace(/"/g, '""')}"`,
      p.published_date || "", p.ai_topics || "", p.source_url,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `observatory_publications_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading knowledge base…</div>;

  return (
    <div>
      {/* Page head */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Knowledge Base
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore the centralized knowledge base of indexed publications, reports, and insights
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <Stat icon={FileText} label="Total Documents" value={total} />
        <Stat icon={Building2} label="Institutions" value={sources} />
        <Stat icon={Tags} label="Topics" value={totalTopics} />
        <Stat icon={Link2} label="Source Links" value={pubs.filter(p => p.source_url).length} />
      </div>

      {/* Row 2 — Categories + Top topics + Overview */}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-5 mb-6">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Knowledge Base Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topics.map(t => (
              <button
                key={t.topic}
                onClick={() => setOpenCategory(t.topic)}
                className="w-full flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0 hover:bg-[var(--bot-gold-soft)] transition text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bot-navy-soft)] text-[var(--bot-navy)] flex items-center justify-center">
                  <Database size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--bot-navy)] capitalize truncate">
                    {t.topic.replace(/_/g, " ")}
                  </div>
                </div>
                <span className="text-sm font-extrabold text-[var(--bot-navy)]">{t.count}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Top topics (bar chart style) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Top Knowledge Base Topics</CardTitle>
          </CardHeader>
          <CardContent>
            {topics.slice(0, 6).map(t => {
              const max = topics[0]?.count || 1;
              const pct = Math.round((t.count / max) * 100);
              return (
                <div key={t.topic} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="capitalize font-semibold text-gray-700">
                      {t.topic.replace(/_/g, " ")}
                    </span>
                    <span className="text-gray-500">{t.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--bot-navy)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Overview stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoBox label="Documents" value={total} />
                <InfoBox label="Sources" value={sources} />
                <InfoBox label="Topics" value={totalTopics} />
                <InfoBox label="AI processed" value={pubs.filter(p => p.ai_processed).length} />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Top Institutions
                </div>
                {institutions.map(i => {
                  const pct = Math.round((i.count / total) * 100);
                  return (
                    <div key={i.institution} className="flex items-center gap-2 py-1.5 text-xs">
                      <span className="w-20 font-semibold text-gray-700">{i.institution}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--bot-gold)]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-500 w-10 text-right">{i.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Recent + Insights */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        {/* Recent items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Recent Knowledge Base Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-bold w-[50%]">Title</th>
                  <th className="text-left px-3 py-3 font-bold">Source</th>
                  <th className="text-left px-3 py-3 font-bold">Date</th>
                  <th className="text-right px-5 py-3 font-bold">Link</th>
                </tr>
              </thead>
              <tbody>
                {pubs.slice(0, 8).map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-[var(--bot-gold-soft)] transition">
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-semibold text-[var(--bot-navy)] leading-snug line-clamp-2">
                        {p.title}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                        {p.institution}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {p.published_date
                        ? new Date(p.published_date).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-7 h-7 rounded-full hover:bg-blue-50 text-blue-600 items-center justify-center transition"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)]">Knowledge Base Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InsightRow
              icon={TrendingUp}
              title="Most discussed topic"
              value={topTopic ? topTopic.topic.replace(/_/g, " ") : "—"}
              sub={topTopic ? `${topTopic.count} publications` : ""}
            />
            <InsightRow
              icon={Sparkles}
              title="Fastest growing"
              value={fastestGrowing ? fastestGrowing.topic.replace(/_/g, " ") : "—"}
              sub={fastestGrowing ? `+${fastestGrowing.score} in last 3 months` : ""}
            />
            <InsightRow
              icon={Building2}
              title="Top source"
              value={institutions[0]?.institution || "—"}
              sub={institutions[0] ? `${institutions[0].count} publications` : ""}
            />
            <InsightRow
              icon={Link2}
              title="AI engine"
              value="Ollama qwen2.5:3b"
              sub="Local, zero-cost inference"
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)]">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <QuickBtn icon={Search} title="Search Knowledge Base" sub="Find documents, reports and insights" />
            <QuickBtn icon={Database} title="Browse by Topic" sub="Explore categorized content" onClick={() => setOpenCategory(topics[0]?.topic)} />
            <QuickBtn icon={Building2} title="Browse by Institution" sub="See what each source publishes" />
            <QuickBtn icon={Download} title="Export Results" sub="Download search results (CSV)" onClick={exportCSV} />
          </div>
        </CardContent>
      </Card>

      {/* Category detail dialog */}
      <Dialog open={!!openCategory} onOpenChange={(o) => !o && setOpenCategory(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openCategory && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[var(--bot-navy)] capitalize text-left">
                  {openCategory.replace(/_/g, " ")}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedPubs.length} publications)
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-4">
                {selectedPubs.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No publications in this category yet.
                  </div>
                ) : (
                  selectedPubs.map(p => (
                    <div key={p.id} className="border border-gray-100 rounded-lg p-4 hover:border-[var(--bot-gold)] transition">
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                          {p.institution}
                        </Badge>
                        <span className="text-xs text-gray-500 self-center">
                          {p.published_date
                            ? new Date(p.published_date).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[var(--bot-navy)] hover:text-blue-600 leading-snug block"
                      >
                        {p.title}
                      </a>
                      {p.ai_summary && (
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {p.ai_summary.replace(/^\d+\.\s/gm, "").slice(0, 200)}…
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ size?: number }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] p-3 rounded-lg">
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-semibold">{label}</div>
          <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xl font-extrabold text-[var(--bot-navy)]">{value}</div>
      <div className="text-[10.5px] text-gray-500 mt-1 font-semibold uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function InsightRow({
  icon: Icon, title, value, sub,
}: { icon: React.ComponentType<{ size?: number }>; title: string; value: string; sub: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] flex items-center justify-center flex-shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide font-bold">{title}</div>
        <div className="text-sm font-bold text-[var(--bot-navy)] capitalize truncate mt-0.5">{value}</div>
        {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function QuickBtn({
  icon: Icon, title, sub, onClick,
}: { icon: React.ComponentType<{ size?: number }>; title: string; sub: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-gray-100 hover:border-[var(--bot-gold)] hover:bg-[var(--bot-gold-soft)] transition"
    >
      <div className="w-9 h-9 rounded-lg bg-[var(--bot-navy-soft)] text-[var(--bot-navy)] flex items-center justify-center mb-2.5">
        <Icon size={16} />
      </div>
      <div className="text-[13px] font-bold text-[var(--bot-navy)]">{title}</div>
      <div className="text-[11px] text-gray-500 mt-1">{sub}</div>
    </button>
  );
}
