/**
 * AdminDashboard.tsx — Admin overview: counts, job status, quick actions.
 */
import { useEffect, useState } from "react";
import {
  RefreshCw, Sparkles, FileText, CheckCircle2, AlertTriangle, Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAdminLogs, triggerCollect, triggerAI,
  type AdminLogs,
} from "@/lib/api";

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AdminLogs | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const data = await getAdminLogs();
    setLogs(data);
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  async function runCollect() {
    setBusy("collect");
    await triggerCollect();
    setTimeout(() => { setBusy(null); refresh(); }, 1500);
  }

  async function runAI() {
    setBusy("ai");
    await triggerAI();
    setTimeout(() => { setBusy(null); refresh(); }, 1500);
  }

  if (!logs) return <div className="text-center py-20 text-gray-500">Loading admin data…</div>;

  const collectJob = logs.jobs.collect;
  const aiJob = logs.jobs.ai;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Admin Control Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage data collection, AI processing, and system status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatBox icon={FileText}     label="Publications" value={logs.total_publications} />
        <StatBox icon={CheckCircle2} label="AI Processed" value={logs.processed} />
        <StatBox icon={AlertTriangle}label="Pending AI"   value={logs.pending} />
        <StatBox icon={Database}     label="Sources"      value={logs.by_source.length} />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
              <RefreshCw size={14} /> Collect Publications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4">
              Fetch new publications from BIS, IMF, World Bank, and CBK.
              Duplicates are skipped automatically.
            </p>
            <div className="flex items-center justify-between">
              <JobStatus job={collectJob} />
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
              <div className="text-xs text-gray-600 mt-3 bg-gray-50 rounded p-2">
                Last run: <span className="font-bold">{collectJob.result.inserted ?? 0}</span> inserted,{" "}
                <span className="font-bold">{collectJob.result.skipped ?? 0}</span> skipped
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
              <Sparkles size={14} /> Run AI Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4">
              Summarize, classify, and assess relevance for all pending publications.
              Uses the local Ollama model.
            </p>
            <div className="flex items-center justify-between">
              <JobStatus job={aiJob} />
              <Button
                onClick={runAI}
                disabled={busy === "ai" || aiJob.status === "running" || logs.pending === 0}
                className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
              >
                <Sparkles size={14} className={aiJob.status === "running" ? "animate-pulse" : ""} />
                {aiJob.status === "running" ? "Running…" : logs.pending === 0 ? "Nothing to process" : "Run AI"}
              </Button>
            </div>
            {aiJob.result && (
              <div className="text-xs text-gray-600 mt-3 bg-gray-50 rounded p-2">
                Last run: <span className="font-bold">{aiJob.result.processed ?? 0}</span> processed,{" "}
                <span className="font-bold">{aiJob.result.failed ?? 0}</span> failed
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sources breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)]">Publications by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.by_source.map(s => {
              const pct = Math.round((s.count / logs.total_publications) * 100);
              return (
                <div key={s.institution} className="grid grid-cols-[120px_1fr_60px_50px] gap-3 items-center text-sm">
                  <span className="font-semibold text-[var(--bot-navy)]">{s.institution}</span>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--bot-navy)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-500 text-right">{pct}%</span>
                  <span className="font-bold text-right">{s.count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({
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

function JobStatus({ job }: { job: { status: string; started_at: string | null; finished_at: string | null } }) {
  const color =
    job.status === "running" ? "bg-amber-100 text-amber-700 border-amber-200"
    : job.status === "done"  ? "bg-green-100 text-green-700 border-green-200"
    : job.status === "error" ? "bg-red-100 text-red-700 border-red-200"
    : "bg-gray-100 text-gray-600 border-gray-200";
  return <Badge className={`border ${color} font-bold capitalize`}>{job.status}</Badge>;
}
