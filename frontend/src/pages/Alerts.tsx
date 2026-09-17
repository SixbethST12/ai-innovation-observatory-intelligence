/**
 * Alerts.tsx — Live system alerts + server-side alert rules + rule matches.
 *
 * FEATURES:
 *   - Polls /admin/alerts every 5s for system/job/trend alerts
 *   - User rules persisted on the backend (/admin/rules)
 *   - Rule matches surfaced (pubs that matched user rules)
 *   - Live progress bars for running jobs
 *   - Color-coded by level (critical/high/medium/info/success)
 */
import { useEffect, useState, useCallback } from "react";
import {
  Bell, AlertTriangle, Info, CheckCircle2, Plus, Trash2,
  RefreshCw, AlertCircle, Activity, Target, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getAlerts, getRules, createRule as createRuleApi, deleteRule as deleteRuleApi,
  getRuleMatches,
  type SystemAlert, type AlertRule, type RuleMatch,
} from "@/lib/api";

const TOPICS = [
  "monetary_policy", "financial_stability", "banking_regulation",
  "financial_markets", "digital_finance", "fintech", "artificial_intelligence",
  "payment_systems", "cybersecurity", "climate_finance", "financial_inclusion",
];
const INSTITUTIONS = ["BIS", "IMF", "World Bank", "CBK"];

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number }> }> = {
  critical: { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     icon: AlertCircle },
  high:     { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  icon: AlertTriangle },
  medium:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   icon: AlertTriangle },
  info:     { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    icon: Info },
  success:  { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   icon: CheckCircle2 },
};

const CATEGORY_COLORS: Record<string, string> = {
  system: "bg-red-50 text-red-700 border-red-200",
  job: "bg-blue-50 text-blue-700 border-blue-200",
  publication: "bg-purple-50 text-purple-700 border-purple-200",
  data: "bg-amber-50 text-amber-700 border-amber-200",
  trend: "bg-green-50 text-green-700 border-green-200",
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [matches, setMatches] = useState<RuleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Create-rule form state
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("all");
  const [topic, setTopic] = useState("all");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [al, ru, ma] = await Promise.all([
        getAlerts(),
        getRules().catch(() => [] as AlertRule[]),
        getRuleMatches(20).catch(() => [] as RuleMatch[]),
      ]);
      setAlerts(al);
      setRules(ru);
      setMatches(ma);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || creating) return;
    setCreating(true);
    try {
      await createRuleApi({
        keyword: keyword.trim(),
        source,
        topic,
        priority,
        created_by: "analyst",
      });
      setKeyword("");
      setSource("all");
      setTopic("all");
      setPriority("medium");
      await refresh();
    } catch (err) {
      console.error("Failed to create rule:", err);
    } finally {
      setCreating(false);
    }
  }

  async function removeRule(id: number) {
    try {
      await deleteRuleApi(id);
      await refresh();
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  }

  const counts = {
    critical: alerts.filter(a => a.level === "critical").length,
    high:     alerts.filter(a => a.level === "high").length,
    medium:   alerts.filter(a => a.level === "medium").length,
    info:     alerts.filter(a => a.level === "info").length,
    success:  alerts.filter(a => a.level === "success").length,
  };

  return (
    <div>
      {/* Page head */}
      <div className="mb-6 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Alerts &amp; Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live system alerts, job progress, and user-defined watch rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Activity size={14} className="text-green-500 animate-pulse" />
            Live · {lastRefresh.toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* Level counters */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatBox icon={AlertCircle}   label="Critical" value={counts.critical} color="#dc2626" />
        <StatBox icon={AlertTriangle} label="High"     value={counts.high}     color="#ea580c" />
        <StatBox icon={AlertTriangle} label="Medium"   value={counts.medium}   color="#b45309" />
        <StatBox icon={Info}          label="Info"     value={counts.info}     color="#1e40af" />
        <StatBox icon={CheckCircle2}  label="Success"  value={counts.success}  color="#16a34a" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        {/* LEFT — System alerts + Rule matches */}
        <div className="space-y-5">
          {/* System alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
                <Bell size={14} /> System Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading alerts…</div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 size={40} className="mx-auto text-green-300 mb-3" />
                  <div className="text-sm font-semibold mb-1">All systems normal</div>
                  <div className="text-xs">No alerts to show.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(a => {
                    const style = LEVEL_STYLES[a.level] || LEVEL_STYLES.info;
                    const Icon = style.icon;
                    const running = (a as any).progress?.running;
                    const percent = (a as any).progress?.percent;
                    return (
                      <div key={a.id} className={`border rounded-lg p-4 transition-all hover:shadow-md ${style.bg} ${style.border}`}>
                        <div className="flex gap-3 items-start">
                          <div className={`mt-0.5 ${style.text} flex-shrink-0`}>
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[13px] font-bold ${style.text}`}>{a.title}</span>
                              {a.category && (
                                <Badge variant="outline" className={`text-[9.5px] uppercase font-extrabold border ${CATEGORY_COLORS[a.category] || "bg-gray-50 text-gray-600"}`}>
                                  {a.category}
                                </Badge>
                              )}
                              {running && (
                                <Badge className="bg-white text-[10px] border font-bold uppercase tracking-wider">
                                  running
                                </Badge>
                              )}
                              <Badge className={`ml-auto text-[10px] uppercase font-bold border ${style.text} ${style.border} bg-white`}>
                                {a.level}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{a.message}</p>

                            {typeof percent === "number" && (
                              <div className="mt-3">
                                <div className="flex justify-between text-[11px] text-gray-600 mb-1 font-semibold">
                                  <span>{(a as any).progress?.done} / {(a as any).progress?.total}</span>
                                  <span className="font-bold">{percent}%</span>
                                </div>
                                <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                                  <div
                                    className="h-full bg-[var(--bot-navy)] transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex gap-3 items-center mt-2 text-[10.5px] text-gray-500">
                              <span className="font-semibold">{a.source}</span>
                              <span>·</span>
                              <span>
                                {new Date(a.timestamp).toLocaleString("en-GB", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rule matches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
                <Target size={14} /> Rule Matches ({matches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No publications matched your rules yet.
                  <div className="text-xs mt-2 text-gray-400">
                    Rules are checked after each new collection.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.slice(0, 10).map(m => (
                    <div
                      key={m.match_id}
                      className="border border-gray-100 rounded-lg p-3 transition-all hover:border-[var(--bot-gold)] hover:bg-[var(--bot-gold-soft)]"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-[10px] font-bold border-[var(--bot-gold)] bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)]">
                          rule: "{m.rule.keyword}"
                        </Badge>
                        <span className="text-[10.5px] text-gray-500 font-semibold">
                          {m.publication.institution}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {new Date(m.matched_at).toLocaleString("en-GB", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <a
                        href={m.publication.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12.5px] font-bold text-[var(--bot-navy)] hover:text-blue-600 leading-snug block"
                      >
                        {m.publication.title.length > 90
                          ? m.publication.title.slice(0, 90) + "…"
                          : m.publication.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Create rule + Rules list */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
                <Plus size={14} /> Create Alert Rule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addRule} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Keyword
                  </label>
                  <Input
                    placeholder="e.g. CBDC, stablecoin"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Source</label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue>{source === "all" ? "Any" : source}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any source</SelectItem>
                        {INSTITUTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Topic</label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue>{topic === "all" ? "Any" : topic.replace(/_/g, " ")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any topic</SelectItem>
                        {TOPICS.map(t => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Priority</label>
                  <div className="flex gap-2 mt-1.5">
                    {(["high", "medium", "low"] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize border transition ${
                          priority === p
                            ? p === "high"   ? "bg-red-100 text-red-700 border-red-300"
                            : p === "medium" ? "bg-amber-100 text-amber-700 border-amber-300"
                            :                  "bg-green-100 text-green-700 border-green-300"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!keyword.trim() || creating}
                  className="w-full bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
                >
                  <Plus size={14} /> {creating ? "Creating…" : "Add Rule"}
                </Button>

                <div className="text-[10.5px] text-gray-400 text-center">
                  Rules run automatically after every new collection.
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold">
                Active Rules ({rules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-6">
                  No rules yet. Create one to start watching.
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map(r => (
                    <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex items-start gap-2 transition hover:border-[var(--bot-gold)]">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-[var(--bot-navy)] truncate">
                          "{r.keyword}"
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {r.source && r.source !== "all" && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-bold">
                              {r.source}
                            </span>
                          )}
                          {r.topic && r.topic !== "all" && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 font-bold capitalize">
                              {r.topic.replace(/_/g, " ")}
                            </span>
                          )}
                          <span className={`text-[10px] rounded px-1.5 py-0.5 font-bold ${
                            r.priority === "high"   ? "bg-red-50 text-red-700"
                            : r.priority === "medium" ? "bg-amber-50 text-amber-700"
                            :                            "bg-green-50 text-green-700"
                          }`}>
                            {r.priority}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRule(r.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                        title="Delete rule"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon, label, value, color,
}: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; color: string }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={18} />
        </div>
        <div>
          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">{label}</div>
          <div className="text-xl font-extrabold text-[var(--bot-navy)] leading-none mt-0.5">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
