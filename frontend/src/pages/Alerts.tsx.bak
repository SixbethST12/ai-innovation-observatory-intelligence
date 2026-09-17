/**
 * Alerts.tsx — Live system alerts + user-defined rules.
 *
 * FEATURES:
 *   - Polls /admin/alerts every 5 seconds
 *   - Shows running jobs with progress bars
 *   - Color-codes by level (critical/high/medium/info/success)
 *   - User-created alert rules (localStorage, prototype only)
 */
import { useEffect, useState, useCallback } from "react";
import {
  Bell, AlertTriangle, Info, CheckCircle2, Plus, Trash2,
  RefreshCw, AlertCircle, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getAlerts, type SystemAlert } from "@/lib/api";

const TOPICS = [
  "monetary_policy", "financial_stability", "banking_regulation",
  "financial_markets", "digital_finance", "fintech", "artificial_intelligence",
  "payment_systems", "cybersecurity", "climate_finance", "financial_inclusion",
];
const INSTITUTIONS = ["BIS", "IMF", "World Bank", "CBK"];

type AlertRule = {
  id: number;
  keyword: string;
  source: string;
  topic: string;
  priority: "high" | "medium" | "low";
};

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number }> }> = {
  critical: { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     icon: AlertCircle },
  high:     { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  icon: AlertTriangle },
  medium:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   icon: AlertTriangle },
  info:     { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    icon: Info },
  success:  { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   icon: CheckCircle2 },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // User-defined rules (localStorage-backed)
  const [rules, setRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem("observatory_alert_rules");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("all");
  const [topic, setTopic] = useState("all");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  // Poll alerts every 5s
  const refresh = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
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

  // Persist rules
  useEffect(() => {
    localStorage.setItem("observatory_alert_rules", JSON.stringify(rules));
  }, [rules]);

  function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setRules(prev => [...prev, { id: Date.now(), keyword: keyword.trim(), source, topic, priority }]);
    setKeyword("");
  }

  function removeRule(id: number) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  // Counts by level
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
            Live system alerts, job progress, and user-defined rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Activity size={14} className="text-green-500 animate-pulse" />
            Live · updated {lastRefresh.toLocaleTimeString()}
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
        {/* Live system alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
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
                    <div
                      key={a.id}
                      className={`border rounded-lg p-4 ${style.bg} ${style.border}`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className={`mt-0.5 ${style.text} flex-shrink-0`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[13px] font-bold ${style.text}`}>
                              {a.title}
                            </span>
                            {running && (
                              <Badge className="bg-white text-[10px] border font-bold uppercase tracking-wider">
                                running
                              </Badge>
                            )}
                            <Badge className={`ml-auto text-[10px] uppercase font-bold border ${style.text} ${style.border} bg-white`}>
                              {a.level}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {a.message}
                          </p>

                          {/* Progress bar for running jobs */}
                          {typeof percent === "number" && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[11px] text-gray-600 mb-1">
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
                            <span>{a.source}</span>
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

        {/* User-defined rules */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
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
                            : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!keyword.trim()}
                  className="w-full bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
                >
                  <Plus size={14} /> Add Rule
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] text-[var(--bot-navy)]">
                My Rules ({rules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-6">
                  No rules yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map(r => (
                    <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-[var(--bot-navy)] truncate">
                          "{r.keyword}"
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {r.source !== "all" && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{r.source}</span>
                          )}
                          {r.topic !== "all" && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 capitalize">
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
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10.5px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
                Rules are stored in your browser. Automatic delivery is a planned feature.
              </div>
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
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={18} />
        </div>
        <div>
          <div className="text-[11px] text-gray-500 font-semibold">{label}</div>
          <div className="text-xl font-extrabold text-[var(--bot-navy)] leading-none mt-0.5">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
