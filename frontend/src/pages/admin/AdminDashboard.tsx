/**
 * AdminDashboard.tsx — Admin control panel.
 *
 * SECTIONS:
 *   1. Service Status — health of Ollama, backend, frontend
 *   2. Operations — collect / AI pipeline / retry / scheduler
 *   3. Activity Feed — recent system events
 */
import { useEffect, useState } from "react";
import {
  RefreshCw, Sparkles, FileText, CheckCircle2, AlertTriangle, Database,
  Play, Square, Clock, RotateCcw, Activity, Zap, Server, Cpu, Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAdminLogs, triggerCollect, triggerAI, getServices, getActivity,
  getSchedulerStatus, startScheduler, stopScheduler, retryFailed,
  type AdminLogs, type ServiceStatus, type ActivityEvent, type SchedulerStatus,
} from "@/lib/api";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  job: Activity,
  rule_match: Zap,
  publication: FileText,
};

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AdminLogs | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [schedulerInterval, setSchedulerInterval] = useState(60);
  const [activityFilter, setActivityFilter] = useState<"all" | "job" | "rule_match" | "publication">("all");

  async function refresh() {
    try {
      const [l, s, a, sch] = await Promise.all([
        getAdminLogs(),
        getServices(),
        getActivity(12),
        getSchedulerStatus().catch(() => null),
      ]);
      setLogs(l);
      setServices(s);
      setActivity(a);
      setScheduler(sch);
    } catch (e) {
      console.warn("Refresh failed:", e);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  async function runCollect() {
    setBusy("collect");
    try {
      await triggerCollect();
      showFlash("Collection started");
      setTimeout(() => { setBusy(null); refresh(); }, 1500);
    } catch { setBusy(null); }
  }

  async function runAI() {
    setBusy("ai");
    try {
      await triggerAI();
      showFlash("AI pipeline started");
      setTimeout(() => { setBusy(null); refresh(); }, 1500);
    } catch { setBusy(null); }
  }

  async function handleRetry() {
    setBusy("retry");
    try {
      const res = await retryFailed();
      showFlash(res.message || "Reset fallback rows");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleSchedulerToggle() {
    if (!scheduler) return;
    setBusy("scheduler");
    try {
      if (scheduler.running) {
        await stopScheduler();
        showFlash("Scheduler stopped");
      } else {
        await startScheduler(schedulerInterval);
        showFlash(`Scheduler started (every ${schedulerInterval} min)`);
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  if (!logs) return <div className="text-center py-20 text-gray-500">Loading admin data…</div>;

  // Filter + group activity by day
  const filtered = activityFilter === "all"
    ? activity
    : activity.filter(a => a.type === activityFilter);

  const grouped: Record<string, ActivityEvent[]> = {};
  filtered.forEach(ev => {
    const d = new Date(ev.timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let day: string;
    if (d.toDateString() === today.toDateString()) day = "Today";
    else if (d.toDateString() === yesterday.toDateString()) day = "Yesterday";
    else day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ev);
  });

  const groupedActivity: [string, ActivityEvent[]][] = Object.entries(grouped);

  const collectJob = logs.jobs.collect;
  const aiJob = logs.jobs.ai;
  const pct = logs.total_publications
    ? Math.round((logs.processed / logs.total_publications) * 100)
    : 0;

  return (
    <div>
      {/* Flash message */}
      {flash && (
        <div className="fixed top-24 right-8 bg-[var(--bot-navy)] text-white px-5 py-3 rounded-lg shadow-lg z-50 font-semibold text-sm animate-in fade-in slide-in-from-top-2">
          {flash}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Admin Control Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage collection, AI processing, scheduling, and system health
        </p>
      </div>

      {/* ============ SECTION 1 — SERVICE STATUS ============ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {services.map(svc => {
          const Icon =
            svc.name === "ollama" ? Cpu :
            svc.name === "backend" ? Server : Globe;
          return (
            <Card key={svc.name} className="transition-all hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  svc.healthy ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 font-bold">
                    {svc.name}
                  </div>
                  <div className="text-sm font-bold text-[var(--bot-navy)] capitalize">
                    {svc.healthy ? "Healthy" : "Down"}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${svc.healthy ? "bg-green-500" : "bg-red-500"}`} />
              </CardContent>
            </Card>
          );
        })}
        {/* Corpus stats card */}
        <Card className="bg-[var(--bot-navy)] text-white">
          <CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wide opacity-80 font-bold">
              Corpus
            </div>
            <div className="text-2xl font-extrabold leading-none mt-1">
              {logs.total_publications}
            </div>
            <div className="text-[11px] mt-1.5 opacity-90">
              {logs.processed} processed · {logs.pending} pending
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ SECTION 2 — OPERATIONS ============ */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Collect */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <RefreshCw size={14} className="text-[var(--bot-gold-dark)]" />
              Collect Publications
              <JobBadge status={collectJob.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Fetch new publications from BIS, IMF, World Bank, and CBK.
              Duplicates are skipped automatically.
            </p>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-gray-500">
                {collectJob.finished_at && (
                  <>Last run: {new Date(collectJob.finished_at).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}</>
                )}
              </div>
              <Button
                onClick={runCollect}
                disabled={busy === "collect" || collectJob.status === "running"}
                className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
              >
                <RefreshCw size={14} className={collectJob.status === "running" ? "animate-spin" : ""} />
                {collectJob.status === "running" ? "Running…" : "Run collection"}
              </Button>
            </div>
            {collectJob.result && (
              <div className="text-xs text-gray-600 mt-3 bg-gray-50 rounded p-2.5 border border-gray-100">
                Last: <span className="font-bold text-[var(--bot-navy)]">{collectJob.result.inserted ?? 0}</span> inserted,{" "}
                <span className="font-bold">{collectJob.result.skipped ?? 0}</span> skipped
                {collectJob.result.matched > 0 && (
                  <> · <span className="font-bold text-[var(--bot-gold-dark)]">{collectJob.result.matched}</span> rule matches</>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI pipeline */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--bot-gold-dark)]" />
              AI Pipeline
              <JobBadge status={aiJob.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Summarize, classify, and assess relevance for pending publications.
            </p>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[11px] mb-1.5 text-gray-600 font-semibold">
                <span>{logs.processed} / {logs.total_publications}</span>
                <span className="font-bold text-[var(--bot-navy)]">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--bot-navy)] to-[var(--bot-gold)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={runAI}
                disabled={busy === "ai" || aiJob.status === "running" || logs.pending === 0}
                className="flex-1 bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
              >
                <Sparkles size={14} className={aiJob.status === "running" ? "animate-pulse" : ""} />
                {aiJob.status === "running" ? "Running…" : logs.pending === 0 ? "Nothing to process" : "Run AI"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRetry}
                disabled={busy === "retry"}
                title="Reset rule-based publications for AI reprocessing"
              >
                <RotateCcw size={14} /> Retry failed
              </Button>
            </div>

            {aiJob.result && (
              <div className="text-xs text-gray-600 mt-3 bg-gray-50 rounded p-2.5 border border-gray-100">
                Last: <span className="font-bold text-[var(--bot-navy)]">{aiJob.result.processed ?? 0}</span> processed,{" "}
                <span className="font-bold">{aiJob.result.failed ?? 0}</span> failed
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ SECTION 2b — SCHEDULER ============ */}
      <Card className="mb-6 transition-all hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
            <Clock size={14} className="text-[var(--bot-gold-dark)]" />
            Automatic Collection Scheduler
            {scheduler?.running ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 border font-bold">
                Running
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 font-bold">
                Stopped
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--bot-navy)]">
                Interval:
              </span>
              <div className="flex gap-2">
                {[15, 30, 60, 180, 360].map(m => (
                  <button
                    key={m}
                    onClick={() => setSchedulerInterval(m)}
                    disabled={scheduler?.running}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold border transition ${
                      schedulerInterval === m
                        ? "bg-[var(--bot-navy)] text-white border-[var(--bot-navy)]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[var(--bot-gold)] disabled:opacity-50"
                    }`}
                  >
                    {m < 60 ? `${m} min` : `${m / 60} hr`}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSchedulerToggle}
              disabled={busy === "scheduler" || !scheduler}
              className={
                scheduler?.running
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {scheduler?.running ? <Square size={14} /> : <Play size={14} />}
              {scheduler?.running ? "Stop scheduler" : "Start scheduler"}
            </Button>
          </div>

          {scheduler?.next_run && (
            <div className="text-[11px] text-gray-500 mt-3">
              Next collection: <span className="font-bold text-[var(--bot-navy)]">{scheduler.next_run}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ SECTION 3 — ACTIVITY FEED ============ */}
      <Card className="transition-all hover:shadow-lg">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
            <Activity size={14} className="text-[var(--bot-gold-dark)]" />
            Recent Activity ({activity.length})
          </CardTitle>
          {/* Filter tabs */}
          <div className="flex gap-2 mt-3">
            {[
              { key: "all", label: "All", icon: Activity },
              { key: "job", label: "Jobs", icon: RefreshCw },
              { key: "rule_match", label: "Rule matches", icon: Zap },
              { key: "publication", label: "Publications", icon: FileText },
            ].map(tab => {
              const TabIcon = tab.icon;
              const active = activityFilter === tab.key;
              const count = tab.key === "all"
                ? activity.length
                : activity.filter(a => a.type === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActivityFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold border transition ${
                    active
                      ? "bg-[var(--bot-navy)] text-white border-[var(--bot-navy)]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[var(--bot-gold)]"
                  }`}
                >
                  <TabIcon size={12} />
                  {tab.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? "bg-white/20" : "bg-gray-100"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {groupedActivity.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              <Activity size={40} className="mx-auto text-gray-300 mb-3" />
              <div className="font-semibold mb-1">No activity yet</div>
              <div className="text-xs">
                {activityFilter === "all"
                  ? "Events will appear here as the system runs."
                  : `No ${activityFilter.replace("_", " ")} events yet.`}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActivity.map(([day, events]) => (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-extrabold">
                      {day}
                    </div>
                    <div className="flex-1 h-px bg-gray-100" />
                    <div className="text-[10.5px] text-gray-400 font-bold">
                      {events.length} {events.length === 1 ? "event" : "events"}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-1.5">
                    {events.map((ev, i) => (
                      <ActivityRow key={i} ev={ev} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more hint */}
              {activity.length >= 12 && (
                <div className="text-center pt-2 border-t border-gray-100">
                  <button
                    onClick={refresh}
                    className="text-[11.5px] font-bold text-[var(--bot-navy)] hover:text-blue-600 py-2"
                  >
                    Refresh to load latest events →
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// ActivityRow — one event row with type badge + click-through
// ============================================================
function ActivityRow({ ev }: { ev: ActivityEvent }) {
  const TYPE_META: Record<string, { label: string; cls: string; icon: React.ComponentType<{ size?: number }> }> = {
    job:          { label: "Job",          cls: "bg-blue-50 text-blue-700 border-blue-200",         icon: RefreshCw },
    rule_match:   { label: "Rule match",   cls: "bg-amber-50 text-amber-700 border-amber-200",     icon: Zap },
    publication:  { label: "Publication",  cls: "bg-purple-50 text-purple-700 border-purple-200",  icon: FileText },
  };
  const meta = TYPE_META[ev.type] || TYPE_META.job;
  const Icon = meta.icon;
  const dotColor =
    ev.level === "success" ? "bg-green-500"
    : ev.level === "high" ? "bg-red-500"
    : ev.level === "medium" ? "bg-amber-500"
    : "bg-blue-500";

  const time = new Date(ev.timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="grid grid-cols-[36px_1fr_auto] gap-3 items-start py-3 px-3 rounded-lg hover:bg-[var(--bot-gold-soft)] transition-all border border-transparent hover:border-[var(--bot-gold-light)]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.cls.replace("text-", "text-").replace("border-", "")}`}>
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[13px] font-bold text-[var(--bot-navy)]">
            {ev.title}
          </span>
          <Badge variant="outline" className={`text-[9.5px] uppercase font-extrabold border ${meta.cls}`}>
            {meta.label}
          </Badge>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        </div>
        <div className="text-[11.5px] text-gray-600 leading-relaxed">
          {ev.message}
        </div>
      </div>

      <span className="text-[10.5px] text-gray-400 whitespace-nowrap font-bold pt-1">
        {time}
      </span>
    </div>
  );
}

function JobBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: "bg-gray-100 text-gray-600 border-gray-200",
    running: "bg-amber-100 text-amber-700 border-amber-200",
    done: "bg-green-100 text-green-700 border-green-200",
    error: "bg-red-100 text-red-700 border-red-200",
  };
  return <Badge className={`border ${map[status] || map.idle} font-bold capitalize ml-auto`}>{status}</Badge>;
}
