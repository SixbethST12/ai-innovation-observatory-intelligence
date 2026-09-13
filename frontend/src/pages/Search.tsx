/**
 * Search.tsx — Keyword + filter search over all publications.
 */
import { useState, useMemo } from "react";
import {
  Search as SearchIcon, ExternalLink, Sparkles, Filter, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Search() {
  const [allPubs, setAllPubs] = useState<Publication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [minRelevance, setMinRelevance] = useState(0);

  // Load everything once
  if (!loaded) {
    getPublications({ limit: 500 }).then(p => {
      setAllPubs(p);
      setLoaded(true);
    });
  }

  const results = useMemo(() => {
    let out = allPubs;
    const q = (submitted || query).toLowerCase().trim();
    if (q) {
      out = out.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.abstract || "").toLowerCase().includes(q) ||
        (p.ai_summary || "").toLowerCase().includes(q) ||
        (p.ai_topics || "").toLowerCase().includes(q)
      );
    }
    if (selectedTopics.length) {
      out = out.filter(p => {
        const topics = p.ai_topics?.split(",") || [];
        return selectedTopics.some(t => topics.includes(t));
      });
    }
    if (selectedInstitutions.length) {
      out = out.filter(p => selectedInstitutions.includes(p.institution));
    }
    if (minRelevance > 0) {
      out = out.filter(p => {
        const rel = relevanceOf(p);
        const score = rel === "high" ? 3 : rel === "medium" ? 2 : 1;
        return score >= minRelevance;
      });
    }
    return out;
  }, [allPubs, query, submitted, selectedTopics, selectedInstitutions, minRelevance]);

  function toggleTopic(t: string) {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function toggleInstitution(i: string) {
    setSelectedInstitutions(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  function reset() {
    setQuery("");
    setSubmitted("");
    setSelectedTopics([]);
    setSelectedInstitutions([]);
    setMinRelevance(0);
  }

  // Derive AI-style query insights from top matching topics
  const queryInsights = useMemo(() => {
    if (!submitted && !query) return null;
    const topicCounts = new Map<string, number>();
    results.forEach(p => {
      p.ai_topics?.split(",").forEach(t => {
        const key = t.trim();
        if (key) topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
      });
    });
    const top = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return top;
  }, [results, submitted, query]);

  return (
    <div>
      {/* Page head */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Search & Discover
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Find relevant publications, reports, and insights using keywords
        </p>
      </div>

      <div className="grid grid-cols-[260px_1fr_280px] gap-5">
        {/* Filters sidebar */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--bot-navy)]">
                <Filter size={14} /> Filters
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-500 hover:text-[var(--bot-navy)] font-semibold"
              >
                Clear all
              </button>
            </div>

            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Source
              </div>
              {INSTITUTIONS.map(inst => (
                <label key={inst} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer hover:text-[var(--bot-navy)]">
                  <input
                    type="checkbox"
                    checked={selectedInstitutions.includes(inst)}
                    onChange={() => toggleInstitution(inst)}
                    className="accent-[var(--bot-navy)]"
                  />
                  <span className="flex-1">{inst}</span>
                  <span className="text-xs text-gray-400">
                    {allPubs.filter(p => p.institution === inst).length}
                  </span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Topic
              </div>
              {TOPICS.map(t => (
                <label key={t} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer hover:text-[var(--bot-navy)]">
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(t)}
                    onChange={() => toggleTopic(t)}
                    className="accent-[var(--bot-navy)]"
                  />
                  <span className="flex-1 capitalize">{t.replace(/_/g, " ")}</span>
                  <span className="text-xs text-gray-400">
                    {allPubs.filter(p => p.ai_topics?.includes(t)).length}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Min Relevance
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={minRelevance}
                onChange={(e) => setMinRelevance(Number(e.target.value))}
                className="w-full accent-[var(--bot-navy)]"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>Any</span>
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div>
          {/* Search bar */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(query); }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search publications, topics, institutions..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]">
                  <SearchIcon size={14} /> Search
                </Button>
              </form>

              <div className="text-xs text-gray-500 mt-3">
                Showing <span className="font-bold text-[var(--bot-navy)]">{results.length}</span> results
                {submitted && <> for "<span className="font-semibold">{submitted}</span>"</>}
              </div>
            </CardContent>
          </Card>

          {/* Result cards */}
          <div className="space-y-3">
            {results.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-gray-500">
                  No results. Try different keywords or clear filters.
                </CardContent>
              </Card>
            ) : (
              results.slice(0, 30).map(p => {
                const rel = relevanceOf(p);
                return (
                  <Card key={p.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bot-navy-soft)] text-[var(--bot-navy)] flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                          {p.institution.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                              {p.institution}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {p.published_date
                                ? new Date(p.published_date).toLocaleDateString("en-GB", {
                                    day: "2-digit", month: "short", year: "numeric",
                                  })
                                : "—"}
                            </span>
                            {p.document_type && (
                              <span className="text-xs text-gray-400 capitalize">
                                · {p.document_type.replace(/_/g, " ")}
                              </span>
                            )}
                            <Badge className={`ml-auto border ${REL_STYLE[rel]} font-bold`}>
                              {rel.charAt(0).toUpperCase() + rel.slice(1)}
                            </Badge>
                          </div>

                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[15px] font-bold text-[var(--bot-navy)] hover:text-blue-600 leading-snug block"
                          >
                            {p.title}
                          </a>

                          {p.ai_topics && (
                            <div className="flex gap-1.5 flex-wrap mt-2">
                              {p.ai_topics.split(",").slice(0, 3).map(t => (
                                <span
                                  key={t}
                                  className="text-[10.5px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-bold capitalize"
                                >
                                  {t.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}

                          {(p.ai_summary || p.abstract) && (
                            <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                              {(p.ai_summary || p.abstract || "")
                                .replace(/^\d+\.\s/gm, "")
                                .slice(0, 240)}…
                            </p>
                          )}

                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold mt-3 hover:underline"
                          >
                            View full publication <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Query insights */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--bot-navy)] mb-4">
              <Sparkles size={14} /> Query Insights
            </div>

            {queryInsights && queryInsights.length > 0 ? (
              <>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Top topics in results
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {queryInsights.map(([topic, count]) => (
                    <span
                      key={topic}
                      className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1 font-bold capitalize"
                    >
                      {topic.replace(/_/g, " ")} <span className="text-blue-500">({count})</span>
                    </span>
                  ))}
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Source breakdown
                </div>
                <div className="space-y-1.5">
                  {INSTITUTIONS.map(inst => {
                    const cnt = results.filter(p => p.institution === inst).length;
                    if (cnt === 0) return null;
                    const pct = Math.round((cnt / results.length) * 100);
                    return (
                      <div key={inst} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-gray-600 font-semibold">{inst}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--bot-navy)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500 leading-relaxed">
                <div className="mb-3 font-semibold text-gray-600">Try searching for:</div>
                {[
                  "monetary policy",
                  "digital finance",
                  "cyber resilience",
                  "financial inclusion",
                  "CBDC",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setSubmitted(s); }}
                    className="block w-full text-left text-xs text-blue-600 hover:text-blue-700 hover:underline py-1"
                  >
                    <SearchIcon size={10} className="inline mr-1" /> {s}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
