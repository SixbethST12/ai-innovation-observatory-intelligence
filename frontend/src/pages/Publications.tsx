/**
 * Publications.tsx — Browse, filter, sort, and inspect publications.
 *
 * FEATURES:
 *   - 4 stat cards
 *   - Search with topic suggestions
 *   - Filters: source, topic, date range, relevance
 *   - Sortable columns (Title, Source, Date, Relevance)
 *   - Table / Card view toggle
 *   - CSV export of filtered results
 *   - Side drawer for detail view (with prev/next navigation)
 */
import { useEffect, useState, useMemo, useRef } from "react";
import {
  FileText, Building2, Tags, Calendar, ExternalLink,
  Search as SearchIcon, ArrowUpDown, ArrowUp, ArrowDown,
  Grid3x3, List, Download, ChevronLeft, ChevronRight, X, SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { getPublications, type Publication } from "@/lib/api";

const TOPICS = [
  "monetary_policy", "financial_stability", "banking_regulation",
  "financial_markets", "digital_finance", "fintech", "artificial_intelligence",
  "payment_systems", "cybersecurity", "climate_finance", "financial_inclusion",
];

const INSTITUTIONS = ["BIS", "IMF", "World Bank", "CBK"];
const PER_PAGE = 20;

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

type SortKey = "title" | "institution" | "published_date" | "relevance";
type SortDir = "asc" | "desc";

export default function Publications({ initialTopic = "" }: { initialTopic?: string }) {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [institution, setInstitution] = useState("all");
  const [topic, setTopic] = useState(initialTopic || "all");
  const [dateRange, setDateRange] = useState("all");
  const [relevance, setRelevance] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("published_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [view, setView] = useState<"table" | "grid">("table");
  const [detail, setDetail] = useState<Publication | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load all pubs once
  useEffect(() => {
    setLoading(true);
    getPublications({ limit: 500 })
      .then(setPubs)
      .finally(() => setLoading(false));
  }, []);

  // Sync when parent passes a topic
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  // Click outside → hide suggestions
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Topic suggestions while typing
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return TOPICS.filter(t =>
      t.replace(/_/g, " ").includes(q) || t.includes(q)
    ).slice(0, 5);
  }, [query]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let out = pubs;

    if (institution !== "all") out = out.filter(p => p.institution === institution);
    if (topic !== "all") out = out.filter(p => p.ai_topics?.includes(topic));

    if (dateRange !== "all") {
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 365;
      const cutoff = Date.now() - days * 86400000;
      out = out.filter(p => p.published_date && new Date(p.published_date).getTime() >= cutoff);
    }

    if (relevance !== "all") {
      out = out.filter(p => relevanceOf(p) === relevance);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.abstract || "").toLowerCase().includes(q) ||
        (p.ai_summary || "").toLowerCase().includes(q) ||
        (p.ai_topics || "").toLowerCase().includes(q),
      );
    }

    const sorted = [...out].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "institution") cmp = a.institution.localeCompare(b.institution);
      else if (sortKey === "published_date") {
        cmp = (a.published_date || "").localeCompare(b.published_date || "");
      } else if (sortKey === "relevance") {
        const order = { high: 3, medium: 2, low: 1 };
        cmp = order[relevanceOf(a)] - order[relevanceOf(b)];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [pubs, institution, topic, dateRange, relevance, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [institution, topic, dateRange, relevance, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function clearFilters() {
    setInstitution("all");
    setTopic("all");
    setDateRange("all");
    setRelevance("all");
    setQuery("");
  }

  function exportCSV() {
    const headers = ["id", "institution", "title", "published_date", "ai_topics", "relevance", "source_url"];
    const rows = filtered.map(p => [
      p.id, p.institution, `"${p.title.replace(/"/g, '""')}"`,
      p.published_date || "", p.ai_topics || "", relevanceOf(p), p.source_url,
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

  // Detail drawer navigation
  const detailIndex = detail ? filtered.findIndex(p => p.id === detail.id) : -1;
  function navDetail(dir: -1 | 1) {
    if (detailIndex === -1) return;
    const next = filtered[detailIndex + dir];
    if (next) setDetail(next);
  }

  const activeFilterCount = [
    institution !== "all",
    topic !== "all",
    dateRange !== "all",
    relevance !== "all",
  ].filter(Boolean).length;

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <MiniStat icon={FileText} label="Total" value={pubs.length} tone="gold" />
        <MiniStat icon={Building2} label="Sources" value={new Set(pubs.map(p => p.institution)).size} tone="blue" />
        <MiniStat icon={Tags} label="Topics" value={11} tone="purple" />
        <MiniStat icon={Calendar} label="Last 7 days" value={
          pubs.filter(p => p.published_date && (Date.now() - new Date(p.published_date).getTime()) < 7 * 86400000).length
        } tone="green" />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center">
            {/* Search with suggestions */}
            <div className="relative" ref={searchRef}>
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                placeholder="Search titles, abstracts, summaries…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-9"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 text-[10.5px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                    Suggested topics
                  </div>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s.replace(/_/g, " ")); setShowSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bot-gold-soft)] transition capitalize"
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Select value={institution} onValueChange={setInstitution}>
              <SelectTrigger><SelectValue>{institution === "all" ? "All Sources" : institution}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {INSTITUTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger><SelectValue>{topic === "all" ? "All Topics" : topic.replace(/_/g, " ")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {TOPICS.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger><SelectValue>
                {dateRange === "all" ? "All time"
                  : dateRange === "7d" ? "Last 7 days"
                  : dateRange === "30d" ? "Last 30 days"
                  : "Last 12 months"}
              </SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="365d">Last 12 months</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setShowAdvanced(v => !v)} className="relative">
              <SlidersHorizontal size={14} /> Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[var(--bot-gold)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Advanced filter panel */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 gap-3">
              <div>
                <label className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">Relevance</label>
                <Select value={relevance} onValueChange={setRelevance}>
                  <SelectTrigger className="mt-1.5"><SelectValue>
                    {relevance === "all" ? "Any" : relevance.charAt(0).toUpperCase() + relevance.slice(1)}
                  </SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="high">High only</SelectItem>
                    <SelectItem value="medium">Medium only</SelectItem>
                    <SelectItem value="low">Low only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X size={14} /> Clear all
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="text-sm text-gray-500">
          Showing <span className="font-bold text-[var(--bot-navy)]">{pageItems.length}</span> of{" "}
          <span className="font-bold text-[var(--bot-navy)]">{filtered.length}</span> publications
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 font-semibold">View:</span>
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition ${
                view === "table" ? "bg-[var(--bot-navy)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <List size={12} /> Table
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition ${
                view === "grid" ? "bg-[var(--bot-navy)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Grid3x3 size={12} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* Table view */}
      {view === "table" && (
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
                    <SortHeader label="Title" col="title" current={sortKey} dir={sortDir} onClick={toggleSort} className="w-[45%] text-left pl-4 py-3" />
                    <SortHeader label="Source" col="institution" current={sortKey} dir={sortDir} onClick={toggleSort} className="text-left py-3" />
                    <SortHeader label="Date" col="published_date" current={sortKey} dir={sortDir} onClick={toggleSort} className="text-left py-3" />
                    <th className="text-left py-3 font-bold">Topics</th>
                    <SortHeader label="Relevance" col="relevance" current={sortKey} dir={sortDir} onClick={toggleSort} className="text-left py-3" />
                    <th className="text-right py-3 pr-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(p => {
                    const topics = p.ai_topics ? p.ai_topics.split(",").slice(0, 2) : [];
                    const rel = relevanceOf(p);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-[var(--bot-gold-soft)] cursor-pointer transition-colors"
                        onClick={() => setDetail(p)}
                      >
                        <td className="p-4 pl-4">
                          <div className="font-bold text-[var(--bot-navy)] text-sm leading-snug line-clamp-2">
                            {p.title}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                            {p.institution}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap font-semibold">
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
                        <td className="p-4 pr-4 text-right">
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-50 text-blue-600 transition"
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
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 py-16 text-center text-gray-500">Loading…</div>
          ) : pageItems.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-gray-500">No publications match.</div>
          ) : (
            pageItems.map(p => {
              const rel = relevanceOf(p);
              return (
                <Card
                  key={p.id}
                  onClick={() => setDetail(p)}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--bot-gold)]"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold text-[10.5px]">
                        {p.institution}
                      </Badge>
                      <span className="text-[11px] text-gray-500 font-semibold">
                        {p.published_date ? new Date(p.published_date).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short",
                        }) : "—"}
                      </span>
                      <Badge className={`ml-auto border ${REL_STYLE[rel]} font-bold text-[10px]`}>
                        {rel.charAt(0).toUpperCase() + rel.slice(1)}
                      </Badge>
                    </div>
                    <div className="font-bold text-[var(--bot-navy)] text-[13.5px] leading-snug line-clamp-3 mb-2">
                      {p.title}
                    </div>
                    {p.ai_topics && (
                      <div className="flex gap-1 flex-wrap">
                        {p.ai_topics.split(",").slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-1.5 py-0.5 font-bold capitalize">
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-5">
          <div className="text-sm text-gray-500">
            Page <span className="font-bold text-[var(--bot-navy)]">{page}</span> of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {detail && (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                    {detail.institution}
                  </Badge>
                  {detail.document_type && (
                    <Badge variant="outline" className="capitalize text-[10.5px]">
                      {detail.document_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <Badge className={`border ${REL_STYLE[relevanceOf(detail)]} font-bold`}>
                    {relevanceOf(detail).charAt(0).toUpperCase() + relevanceOf(detail).slice(1)} relevance
                  </Badge>
                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => navDetail(-1)}
                      disabled={detailIndex <= 0}
                      className="w-7 h-7 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => navDetail(1)}
                      disabled={detailIndex >= filtered.length - 1}
                      className="w-7 h-7 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <SheetTitle className="text-lg font-bold text-[var(--bot-navy)] leading-snug text-left">
                  {detail.title}
                </SheetTitle>
                <div className="text-xs text-gray-500 mt-2 font-semibold">
                  {detail.published_date ? new Date(detail.published_date).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "long", year: "numeric",
                  }) : "Date not available"}
                </div>
              </SheetHeader>

              <div className="p-6 space-y-5 flex-1">
                {detail.ai_topics && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-2">Topics</div>
                    <div className="flex gap-2 flex-wrap">
                      {detail.ai_topics.split(",").map(t => (
                        <span key={t} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 font-bold capitalize">
                          {t.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detail.ai_summary && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-2">AI Summary</div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {detail.ai_summary}
                    </div>
                  </div>
                )}

                {detail.abstract && !detail.ai_summary && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-2">Abstract</div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                      {detail.abstract}
                    </div>
                  </div>
                )}

                {detail.ai_relevance && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Relevance to Bank of Tanzania
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {detail.ai_relevance}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="text-[11px] text-gray-400 font-semibold">
                  {detail.ai_engine && <>AI engine: <span className="font-bold">{detail.ai_engine}</span></>}
                </div>
                <a href={detail.source_url} target="_blank" rel="noreferrer">
                  <Button className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)] text-white">
                    <ExternalLink size={14} /> Open original source
                  </Button>
                </a>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SortHeader({
  label, col, current, dir, onClick, className = "",
}: {
  label: string;
  col: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === col;
  return (
    <th className={`font-bold ${className}`}>
      <button
        onClick={() => onClick(col)}
        className="inline-flex items-center gap-1 hover:text-[var(--bot-navy)] transition"
      >
        {label}
        {active
          ? (dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
          : <ArrowUpDown size={11} className="opacity-40" />}
      </button>
    </th>
  );
}

function MiniStat({
  icon: Icon, label, value, tone,
}: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; tone: "gold" | "blue" | "green" | "purple" }) {
  const tones = {
    gold:   "bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)]",
    blue:   "bg-blue-50 text-blue-700",
    green:  "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`${tones[tone]} p-3 rounded-lg`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
