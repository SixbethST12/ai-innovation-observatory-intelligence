/**
 * TopicClassification.tsx — Browse publications grouped by the 11 topics.
 */
import { useEffect, useState, useMemo } from "react";
import {
  Coins, Shield, Landmark, TrendingUp, Wallet, Cpu, Brain,
  CreditCard, Lock, Leaf, Users, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getPublications, getTrends, type Publication, type TopicCount } from "@/lib/api";

const TOPIC_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  monetary_policy:         { label: "Monetary Policy",                 icon: Coins,     color: "#1e40af" },
  financial_stability:     { label: "Financial Stability",             icon: Shield,    color: "#16a34a" },
  banking_regulation:      { label: "Banking Regulation",              icon: Landmark,  color: "#7c3aed" },
  financial_markets:       { label: "Financial Markets",               icon: TrendingUp,color: "#0d9488" },
  digital_finance:         { label: "Digital Finance",                 icon: Wallet,    color: "#c8a04a" },
  fintech:                 { label: "FinTech",                         icon: Cpu,       color: "#dc2626" },
  artificial_intelligence: { label: "Artificial Intelligence",         icon: Brain,     color: "#0891b2" },
  payment_systems:         { label: "Payment Systems",                 icon: CreditCard,color: "#9333ea" },
  cybersecurity:           { label: "Cybersecurity",                   icon: Lock,      color: "#b45309" },
  climate_finance:         { label: "Climate & Sustainable Finance",   icon: Leaf,      color: "#15803d" },
  financial_inclusion:     { label: "Financial Inclusion",             icon: Users,     color: "#be185d" },
};

export default function TopicClassification() {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [topicCounts, setTopicCounts] = useState<TopicCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPublications({ limit: 500 }), getTrends()])
      .then(([p, t]) => {
        setPubs(p);
        setTopicCounts(t);
      })
      .finally(() => setLoading(false));
  }, []);

  const countByTopic = useMemo(() => {
    const m: Record<string, number> = {};
    topicCounts.forEach(t => { m[t.topic] = t.count; });
    return m;
  }, [topicCounts]);

  const selectedPubs = useMemo(() => {
    if (!selected) return [];
    return pubs.filter(p => p.ai_topics?.split(",").includes(selected));
  }, [pubs, selected]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading topics…</div>;

  return (
    <div>
      {/* Page head */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Topic Classification
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse publications classified into {Object.keys(TOPIC_META).length} central banking and financial sector topics
        </p>
      </div>

      {/* Topic grid */}
      <div className="grid grid-cols-3 gap-5">
        {Object.entries(TOPIC_META).map(([slug, meta]) => {
          const Icon = meta.icon;
          const count = countByTopic[slug] || 0;
          return (
            <Card
              key={slug}
              onClick={() => setSelected(slug)}
              className="cursor-pointer hover:border-[var(--bot-gold)] transition"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[var(--bot-navy)] leading-tight">
                    {meta.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5">
                    {count} {count === 1 ? "publication" : "publications"}
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: meta.color,
                        width: `${Math.min(100, (count / (topicCounts[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog — list publications in the selected topic */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[var(--bot-navy)] text-left">
                  {TOPIC_META[selected].label}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedPubs.length} publications)
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-4">
                {selectedPubs.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No publications classified under this topic yet.
                  </div>
                )}
                {selectedPubs.map(p => (
                  <div
                    key={p.id}
                    className="border border-gray-100 rounded-lg p-4 hover:border-[var(--bot-gold)] transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 mb-2">
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
                        </div>
                        <div className="text-sm font-semibold text-[var(--bot-navy)] leading-snug">
                          {p.title}
                        </div>
                        {p.ai_summary && (
                          <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {p.ai_summary.replace(/^\d+\.\s/gm, "").slice(0, 200)}…
                          </div>
                        )}
                      </div>
                      <a href={p.source_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink size={13} />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
