/**
 * Alerts.tsx — Real system alerts derived from backend state.
 *
 * Reads GET /admin/alerts — live job outcomes, service health,
 * backlog warnings, and stale-data checks.
 */
import { useEffect, useState } from "react";
import {
  Bell, AlertTriangle, Info, CheckCircle2, XCircle, X,
  RefreshCw, Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAlerts, type SystemAlert } from "@/lib/api";

const LEVEL_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number }> }> = {
  critical: { label: "Critical", color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  high:     { label: "High",     color: "#b45309", bg: "#fef3c7", icon: AlertTriangle },
  medium:   { label: "Medium",   color: "#0369a1", bg: "#dbeafe", icon: Info },
  info:     { label: "Info",     color: "#6b7280", bg: "#f3f4f6", icon: Info },
  success:  { label: "Success",  color: "#16a34a", bg: "#dcfce7", icon: CheckCircle2 },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function refresh() {
    const data = await getAlerts();
    setAlerts(data);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const filtered = filter === "all" ? visible : visible.filter(a => a.level === filter);

  const counts = {
    critical: visible.filter(a => a.level === "critical").length,
    high:     visible.filter(a => a.level === "high").length,
    medium:   visible.filter(a => a.level === "medium").length,
    info:     visible.filter(a => a.level === "info").length,
    success:  visible.filter(a => a.level === "success").length,
  };

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
  }

  return (
    <div>
      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Alerts & Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live system alerts from collection jobs, AI pipeline, and services
          </p>
        </div>
        <Button
          onClick={refresh}
          variant="outline"
          className="gap-2 border-[var(--bot-navy)] text-[var(--bot-navy)]"
        >
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Priority cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <PriorityCard label="Critical" count={counts.critical} color="#dc2626" icon={XCircle} />
        <PriorityCard label="High"     count={counts.high}     color="#b45309" icon={AlertTriangle} />
        <PriorityCard label="Medium"   count={counts.medium}   color="#0369a1" icon={Info} />
        <PriorityCard label="Success"  count={counts.success}  color="#16a34a" icon={CheckCircle2} />
      </div>

      {/* Filter */}
      <Card className="mb-4">
        <CardContent className="flex items-center gap-3 p-4">
          <Filter size={16} className="text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            {(["all", "critical", "high", "medium", "info", "success"] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`text-xs px-3 py-1.5 rounded-full border font-bold capitalize transition ${
                  filter === lvl
                    ? "bg-[var(--bot-navy)] text-white border-[var(--bot-navy)]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {lvl} {lvl === "all" ? `(${visible.length})` : `(${counts[lvl as keyof typeof counts] || 0})`}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-500">Loading alerts…</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Bell size={48} className="mx-auto text-gray-300 mb-3" />
              <div className="text-sm font-bold text-gray-600">No alerts</div>
              <div className="text-xs text-gray-500 mt-1">
                {filter === "all"
                  ? "Everything is running smoothly. Alerts appear here automatically."
                  : `No ${filter} alerts.`}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(a => {
                const meta = LEVEL_META[a.level] || LEVEL_META.info;
                const Icon = meta.icon;
                return (
                  <div key={a.id} className="flex gap-4 p-5 hover:bg-gray-50 transition">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge
                          className="border font-bold text-[10.5px]"
                          style={{
                            background: meta.bg,
                            color: meta.color,
                            borderColor: meta.color + "40",
                          }}
                        >
                          {meta.label}
                        </Badge>
                        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">
                          {a.source}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          · {new Date(a.timestamp).toLocaleString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-[var(--bot-navy)]">
                        {a.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {a.message}
                      </div>
                    </div>
                    <button
                      onClick={() => dismiss(a.id)}
                      className="text-gray-300 hover:text-gray-500 transition p-1 self-start"
                      title="Dismiss"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-400 mt-4 text-center">
        Alerts refresh automatically every 5 seconds. Dismissals are session-only.
      </div>
    </div>
  );
}

function PriorityCard({
  label, count, color, icon: Icon,
}: { label: string; count: number; color: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: color + "15", color }}
        >
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-semibold">{label}</div>
          <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">{count}</div>
        </div>
      </CardContent>
    </Card>
  );
}
