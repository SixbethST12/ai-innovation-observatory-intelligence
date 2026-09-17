/**
 * Publications.tsx — Browse all publications with filters and detail dialog.
 */
import { useEffect, useState, useMemo } from "react";
import {
  FileText, Building2, Tags, Calendar, ExternalLink, Search as SearchIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getPublications, type Publication } from "@/lib/api";

const TOPICS = [
  "monetary_policy", "financial_stability", "banking_regulation",
  "financial_markets", "digital_finance", "fintech", "artificial_intelligence",
  "payment_systems", "cybersecurity", "climate_finance", "financial_inclusion",
];

const INSTITUTIONS = ["BIS", "IMF", "World Bank", "CBK"];

function relevanceOf(p: Publication): "high" | "medium" | "low" {
  const t = p.ai_topics ? p.ai_topics.split(",").filter(Boolean).length : 0;
  if (t >= 3) return "high";
  if (t >= 2) return "medium";
  return "low";
}

const REL_STYLE = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-green-100 text-green-700 border-green-200",
} as const;

export default function Publications({ initialTopic = "" }: { initialTopic?: string }) {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [institution, setInstitution] = useState("all");
  const [topic, setTopic] = useState(initialTopic || "all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Publication | null>(null);

  const PER_PAGE = 20;

  useEffect(() => {
    setLoading(true);
    getPublications({ limit: 500 })
      .then(setPubs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let out = pubs;
    if (institution !== "all") out = out.filter(p => p.institution === institution);
    if (topic !== "all") out = out.filter(p => p.ai_topics?.includes(topic));
    if (dateRange !== "all") {
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 365;
      const cutoff = Date.now() - days * 86400000;
      out = out.filter(p => p.published_date && new Date(p.published_date).getTime() >= cutoff);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.abstract || "").toLowerCase().includes(q) ||
        (p.ai_summary || "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [pubs, institution, topic, dateRange, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [institution, topic, dateRange, query]);
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);
  return (
    <div>
      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Publications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Explore the latest publications, reports, and insights from global and regional sources
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <MiniStat icon={FileText} label="Total" value={pubs.length} />
        <MiniStat icon={Building2} label="Sources" value={new Set(pubs.map(p => p.institution)).size} />
        <MiniStat icon={Tags} label="Topics" value={11} />
        <MiniStat icon={Calendar} label="Last 7 days" value={
          pubs.filter(p => p.published_date && (Date.now() - new Date(p.published_date).getTime()) < 7 * 86400000).length
        } />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 items-center">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by keyword in title, abstract, summary..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={institution} onValueChange={setInstitution}>
              <SelectTrigger>
                <SelectValue>{institution === "all" ? "All Sources" : institution}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {INSTITUTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger>
                <SelectValue>{topic === "all" ? "All Topics" : topic.replace(/_/g, " ")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {TOPICS.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue>
                  {dateRange === "all" ? "All time"
                    : dateRange === "7d" ? "Last 7 days"
                    : dateRange === "30d" ? "Last 30 days"
                    : "Last 12 months"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="365d">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          Showing <span className="font-bold text-[var(--bot-navy)]">{pageItems.length}</span> of{" "}
          <span className="font-bold text-[var(--bot-navy)]">{filtered.length}</span> publications
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-500">Loading publications…</div>
          ) : pageItems.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No publications match your filters.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left p-4 font-bold w-[50%]">Title</th>
                  <th className="text-left p-4 font-bold">Source</th>
                  <th className="text-left p-4 font-bold">Date</th>
                  <th className="text-left p-4 font-bold">Topics</th>
                  <th className="text-left p-4 font-bold">Relevance</th>
                  <th className="text-right p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(p => {
                  const topics = p.ai_topics ? p.ai_topics.split(",").slice(0, 2) : [];
                  const rel = relevanceOf(p);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50 hover:bg-[var(--bot-gold-soft)] cursor-pointer transition"
                      onClick={() => setDetail(p)}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-[var(--bot-navy)] text-sm leading-snug line-clamp-2">
                          {p.title}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                          {p.institution}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                        {p.published_date ? new Date(p.published_date).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        }) : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {topics.map(t => (
                            <span key={t} className="text-[10.5px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-bold capitalize">
                              {t.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`border ${REL_STYLE[rel]} font-bold`}>
                          {rel.charAt(0).toUpperCase() + rel.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-50 text-blue-600 transition"
                          title="Open original source"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-5">
          <div className="text-sm text-gray-500">
            Page <span className="font-bold text-[var(--bot-navy)]">{page}</span> of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex gap-2 mb-2">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                    {detail.institution}
                  </Badge>
                  {detail.document_type && (
                    <Badge variant="outline" className="capitalize">
                      {detail.document_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <Badge className={`border ${REL_STYLE[relevanceOf(detail)]} font-bold`}>
                    {relevanceOf(detail).charAt(0).toUpperCase() + relevanceOf(detail).slice(1)} relevance
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-[var(--bot-navy)] leading-snug text-left">
                  {detail.title}
                </DialogTitle>
                <div className="text-xs text-gray-500 mt-1">
                  {detail.published_date ? new Date(detail.published_date).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "long", year: "numeric",
                  }) : "Date not available"}
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Topics */}
                {detail.ai_topics && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Topics
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {detail.ai_topics.split(",").map(t => (
                        <span key={t} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 font-bold capitalize">
                          {t.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI summary */}
                {detail.ai_summary && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      AI Summary
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {detail.ai_summary}
                    </div>
                  </div>
                )}

                {/* Abstract */}
                {detail.abstract && !detail.ai_summary && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Abstract
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                      {detail.abstract}
                    </div>
                  </div>
                )}

                {/* AI relevance */}
                {detail.ai_relevance && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Relevance to Bank of Tanzania
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {detail.ai_relevance}
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    {detail.ai_engine && <>AI engine: <span className="font-semibold">{detail.ai_engine}</span></>}
                  </div>
                  <a href={detail.source_url} target="_blank" rel="noreferrer">
                    <Button className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)] text-white">
                      <ExternalLink size={14} /> Open original source
                    </Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({
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
