/**
 * SystemLogs.tsx — Job history + system info.
 */
import { useEffect, useState } from "react";
import {
  Activity, CheckCircle2, AlertTriangle, Server, Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminLogs, getAdminSystem, type AdminLogs } from "@/lib/api";

export default function SystemLogs() {
  const [logs, setLogs] = useState<AdminLogs | null>(null);
  const [system, setSystem] = useState<{ llm_model: string; ollama_url: string; topics_count: number } | null>(null);

  useEffect(() => {
    getAdminLogs().then(setLogs);
    getAdminSystem().then(setSystem);
    const id = setInterval(() => getAdminLogs().then(setLogs), 3000);
    return () => clearInterval(id);
  }, []);

  if (!logs || !system) return <div className="text-center py-20 text-gray-500">Loading logs…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          System Logs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Background job status and system configuration
        </p>
      </div>

      {/* System info */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] p-3 rounded-lg">
              <Cpu size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold">LLM Model</div>
              <div className="text-sm font-bold text-[var(--bot-navy)] mt-1">
                {system.llm_model}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] p-3 rounded-lg">
              <Server size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold">Ollama URL</div>
              <div className="text-sm font-bold text-[var(--bot-navy)] mt-1 truncate">
                {system.ollama_url}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] p-3 rounded-lg">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold">Topics</div>
              <div className="text-sm font-bold text-[var(--bot-navy)] mt-1">
                {system.topics_count} categories
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)]">Background Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(logs.jobs).map(([name, job]) => (
            <div key={name} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {job.status === "done" && <CheckCircle2 size={16} className="text-green-600" />}
                  {job.status === "running" && <Activity size={16} className="text-amber-600 animate-pulse" />}
                  {job.status === "error" && <AlertTriangle size={16} className="text-red-600" />}
                  {job.status === "idle" && <Activity size={16} className="text-gray-400" />}
                  <span className="font-bold text-[var(--bot-navy)] capitalize">{name}</span>
                </div>
                <JobBadge status={job.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-semibold">Started:</span>{" "}
                  {job.started_at ? new Date(job.started_at).toLocaleString() : "—"}
                </div>
                <div>
                  <span className="font-semibold">Finished:</span>{" "}
                  {job.finished_at ? new Date(job.finished_at).toLocaleString() : "—"}
                </div>
              </div>

              {job.result && (
                <div className="mt-3 text-xs bg-gray-50 rounded p-2">
                  <span className="font-semibold">Result:</span>{" "}
                  {JSON.stringify(job.result)}
                </div>
              )}
              {job.error && (
                <div className="mt-3 text-xs bg-red-50 text-red-700 rounded p-2">
                  <span className="font-semibold">Error:</span> {job.error}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function JobBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle:    "bg-gray-100 text-gray-600 border-gray-200",
    running: "bg-amber-100 text-amber-700 border-amber-200",
    done:    "bg-green-100 text-green-700 border-green-200",
    error:   "bg-red-100 text-red-700 border-red-200",
  };
  return <Badge className={`border ${map[status]} font-bold capitalize`}>{status}</Badge>;
}
