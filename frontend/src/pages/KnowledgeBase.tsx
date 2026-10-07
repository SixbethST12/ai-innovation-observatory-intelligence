/**
 * KnowledgeBase.tsx — Browse all publications three ways: topic, source, time.
 *
 * FEATURES:
 *   - Top search bar → jumps to Search page with query
 *   - Browse by Topic (11 large clickable tiles)
 *   - Browse by Source (4 tiles)
 *   - Browse by Time (monthly tiles)
 *   - About section with honest AI disclaimer
 *   - Click any tile → side drawer with matching publications
 */
import { useEffect, useMemo, useState } from "react";
import {
  Coins, Shield, Landmark, TrendingUp, Wallet, Cpu, Brain,
  CreditCard, Lock, Leaf, Users, Building2, Calendar,
  Search as SearchIcon, ExternalLink, BookOpen, Info, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { getPublications, getInstitutions, type Publication, type InstitutionCount, getTopics } from "@/lib/api";
// eslint-disable-next-line

const TOPIC_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  monetary_policy:         { label: "Monetary Policy",               icon: Coins,      color: "#1e40af" },
  financial_stability:     { label: "Financial Stability",           icon: Shield,     color: "#16a34a" },
  banking_regulation:      { label: "Banking Regulation",            icon: Landmark,   color: "#7c3aed" },
  financial_markets:       { label: "Financial Markets",             icon: TrendingUp, color: "#0d9488" },
  digital_finance:         { label: "Digital Finance",               icon: Wallet,     color: "#c8a04a" },
  fintech:                 { label: "FinTech",                       icon: Cpu,        color: "#dc2626" },
  artificial_intelligence: { label: "Artificial Intelligence",       icon: Brain,      color: "#0891b2" },
  payment_systems:         { label: "Payment Systems",               icon: CreditCard, color: "#9333ea" },
  cybersecurity:           { label: "Cybersecurity",                 icon: Lock,       color: "#b45309" },
  climate_finance:         { label: "Climate & Sustainable Finance", icon: Leaf,       color: "#15803d" },
  financial_inclusion:     { label: "Financial Inclusion",           icon: Users,      color: "#be185d" },
};


const FALLBACK_COLORS = [
  "#0ea5e9", "#f43f5e", "#8b5cf6", "#f59e0b", "#10b981",
  "#6366f1", "#ec4899", "#14b8a6", "#a855f7", "#ef4444", "#22c55e",
];


type DrawerData = {
  title: string;
  items: Publication[];
} | null;

export default function KnowledgeBase() {
  const [dbTopics, setDbTopics] = useState<{slug: string; label: string}[]>([]);
  useEffect(() => {
    getTopics().then(t => setDbTopics(t.map((x: any) => ({ slug: x.slug, label: x.label })))).catch(() => {});
  }, []);

  // Merge DB topics with hardcoded icons/colors; unknown slugs get defaults
  const mergedTopics = useMemo(() => {
    if (dbTopics.length === 0) return TOPIC_META;
    const out: Record<string, { label: string; icon: any; color: string }> = {};
    const iconNames = Object.values(TOPIC_META);
    dbTopics.forEach((t, i) => {
      const existing = (TOPIC_META as any)[t.slug];
      out[t.slug] = existing || {
        label: t.label,
        icon: iconNames[i % iconNames.length].icon,
        color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      };
    });
    return out;
  }, [dbTopics]);

  const [pubs, setPubs] = useState<Publication[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<DrawerData>(null);

  useEffect(() => {
    Promise.all([getPublications({ limit: 500 }), getInstitutions()])
      .then(([p, i]) => {
        setPubs(p);
        setInstitutions(i);
      })
      .finally(() => setLoading(false));
  }, []);

  const topicCounts = useMemo(() => {
    const m: Record<string, number> = {};
    Object.keys(mergedTopics).forEach(slug => { m[slug] = 0; });
    pubs.forEach(p => {
      p.ai_topics?.split(",").forEach(t => {
        const k = t.trim();
        if (k in m) m[k]++;
      });
    });
    return m;
  }, [pubs]);

  const monthCounts = useMemo(() => {
    const m: Record<string, number> = {};
    pubs.forEach(p => {
      if (!p.published_date) return;
      const mo = p.published_date.slice(0, 7);
      m[mo] = (m[mo] || 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12);
  }, [pubs]);

  const total = pubs.length;

  function openTopic(slug: string) {
    const items = pubs.filter(p => p.ai_topics?.split(",").includes(slug));
    setDrawer({ title: TOPIC_META[slug].label, items });
  }

  function openSource(name: string) {
    const items = pubs.filter(p => p.institution === name);
    setDrawer({ title: name, items });
  }

  function openMonth(month: string) {
    const items = pubs.filter(p => p.published_date?.startsWith(month));
    const label = new Date(month + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    setDrawer({ title: label, items });
  }

  function goToSearch() {
    window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "search" } }));
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading knowledge base…</div>;

  return (
    <div>
      {/* Page head with search */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Knowledge Base
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse the corpus by topic, source, or time
        </p>
      </div>

      {/* Search bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); goToSearch(); }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search across all publications…"
                className="pl-9"
              />
            </div>
            <Button type="submit" className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]">
              <SearchIcon size={14} /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Browse by Topic */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-[var(--bot-gold-dark)]" />
          <h2 className="text-base font-extrabold text-[var(--bot-navy)]">Browse by Topic</h2>
          <span className="text-xs text-gray-500 font-semibold">({Object.keys(mergedTopics).length} categories)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(mergedTopics).map(([slug, meta]) => {
            const Icon = meta.icon;
            const count = topicCounts[slug] || 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <Card
                key={slug}
                onClick={() => openTopic(slug)}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--bot-gold)] group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--bot-navy)] leading-tight">
                        {meta.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1.5 font-semibold">
                        {count} {count === 1 ? "document" : "documents"} · {pct}%
                      </div>
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Browse by Source */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-[var(--bot-gold-dark)]" />
          <h2 className="text-base font-extrabold text-[var(--bot-navy)]">Browse by Source</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {institutions.map(inst => {
            const pct = total ? Math.round((inst.count / total) * 100) : 0;
            return (
              <Card
                key={inst.institution}
                onClick={() => openSource(inst.institution)}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--bot-gold)]"
              >
                <CardContent className="p-5 text-center">
                  <div className="text-3xl font-extrabold text-[var(--bot-navy)]">{inst.count}</div>
                  <div className="text-sm font-bold text-[var(--bot-navy)] mt-1">{inst.institution}</div>
                  <div className="text-[11px] text-gray-500 mt-1 font-semibold">{pct}% of corpus</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Browse by Time */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[var(--bot-gold-dark)]" />
          <h2 className="text-base font-extrabold text-[var(--bot-navy)]">Browse by Time</h2>
          <span className="text-xs text-gray-500 font-semibold">(last 12 active months)</span>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {monthCounts.map(([month, count]) => {
            const label = new Date(month + "-01").toLocaleDateString("en-GB", { month: "short", year: "numeric" });
            return (
              <Card
                key={month}
                onClick={() => openMonth(month)}
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--bot-gold)]"
              >
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-extrabold text-[var(--bot-navy)]">{count}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wide">
                    {label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* About */}
      <Card className="border-[var(--bot-gold-light)] bg-[var(--bot-gold-soft)]">
        <CardHeader>
          <CardTitle className="text-[14px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
            <Info size={15} className="text-[var(--bot-gold-dark)]" />
            About this Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-[12.5px] text-gray-700 space-y-1.5 leading-relaxed">
            <li>• <strong>{total} publications</strong> from <strong>{institutions.length} approved sources</strong> (BIS, IMF, World Bank, CBK)</li>
            <li>• AI-classified into <strong>11 canonical central banking topics</strong> using <strong>Ollama qwen2.5:3b</strong></li>
            <li>• Every summary, classification, and relevance note is <strong>AI-generated</strong></li>
            <li>• Always verify against the original source — link available on every publication</li>
            <li>• For accuracy limits see <a href="https://github.com/SixbethST12/ai-innovation-observatory-intelligence/blob/main/docs/AI_LIMITATIONS.md" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">docs/AI_LIMITATIONS.md ↗</a></li>
          </ul>
        </CardContent>
      </Card>

      {/* Drawer */}
      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {drawer && (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold">
                    {drawer.items.length} {drawer.items.length === 1 ? "document" : "documents"}
                  </Badge>
                  <button
                    onClick={() => setDrawer(null)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                <SheetTitle className="text-lg font-bold text-[var(--bot-navy)] text-left">
                  {drawer.title}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 p-6 space-y-3">
                {drawer.items.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No publications in this category.</div>
                ) : (
                  drawer.items.map(p => (
                    <div
                      key={p.id}
                      className="border border-gray-100 rounded-lg p-4 transition-all hover:border-[var(--bot-gold)] hover:bg-[var(--bot-gold-soft)]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold text-[10.5px]">
                          {p.institution}
                        </Badge>
                        <span className="text-[11px] text-gray-500 font-semibold">
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
                        className="text-[13.5px] font-bold text-[var(--bot-navy)] hover:text-blue-600 leading-snug block"
                      >
                        {p.title}
                      </a>
                      {p.ai_summary && (
                        <div className="text-[11.5px] text-gray-500 mt-2 line-clamp-2">
                          {p.ai_summary.replace(/^\d+\.\s/gm, "").slice(0, 200)}…
                        </div>
                      )}
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold mt-2 hover:underline"
                      >
                        Open source <ExternalLink size={10} />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
