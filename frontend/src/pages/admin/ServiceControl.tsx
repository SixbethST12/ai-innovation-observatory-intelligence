/**
 * ServiceControl.tsx — Admin: monitor and restart local services.
 */
import { useEffect, useState } from "react";
import {
  Activity, CheckCircle2, AlertTriangle, RotateCw, FileText,
  Server, Cpu, Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  getServices, restartService, getServiceLogs,
  type ServiceInfo, type ServiceLogs,
} from "@/lib/api";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  ollama: Cpu,
  backend: Server,
  frontend: Globe,
};

export default function ServiceControl() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [logs, setLogs] = useState<ServiceLogs | null>(null);
  const [logsFor, setLogsFor] = useState<string | null>(null);

  async function refresh() {
    const list = await getServices();
    setServices(list);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  async function doRestart(name: string) {
    setRestarting(name);
    try {
      await restartService(name);
      await new Promise(r => setTimeout(r, 3000));
      await refresh();
    } finally {
      setRestarting(null);
    }
  }

  async function showLogs(name: string) {
    setLogsFor(name);
    const data = await getServiceLogs(name, 80);
    setLogs(data);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Service Control
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor and restart local services (Ollama, backend, frontend)
        </p>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="text-xs text-amber-800 p-4 leading-relaxed">
          <strong>Careful:</strong> Restarting the backend will briefly interrupt this
          page. It comes back automatically in a few seconds. Restarting services is
          only available in local / Codespaces environments.
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading services…</div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {services.map(s => {
            const Icon = ICONS[s.name] || Server;
            const isRestarting = restarting === s.name;
            return (
              <Card key={s.name}>
                <CardHeader>
                  <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon size={16} className="text-[var(--bot-gold-dark)]" />
                      <span className="capitalize">{s.name}</span>
                    </span>
                    {s.running && s.healthy ? (
                      <Badge className="bg-green-100 text-green-700 border border-green-200 font-bold">
                        Healthy
                      </Badge>
                    ) : s.running ? (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-bold">
                        Running
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border border-red-200 font-bold">
                        Stopped
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <Row label="PID" value={s.pid ? String(s.pid) : "—"} />
                    <Row label="Health URL" value={s.health_url.replace("http://", "")} small />
                    <Row
                      label="Status"
                      value={s.running && s.healthy ? "Responding" : s.running ? "No response" : "Not running"}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => doRestart(s.name)}
                      disabled={isRestarting}
                      className="flex-1 bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
                    >
                      <RotateCw size={14} className={isRestarting ? "animate-spin" : ""} />
                      {isRestarting ? "Restarting…" : "Restart"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => showLogs(s.name)}
                      className="flex-shrink-0"
                    >
                      <FileText size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Logs dialog */}
      <Dialog open={!!logsFor} onOpenChange={(o) => { if (!o) { setLogsFor(null); setLogs(null); } }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--bot-navy)] capitalize text-left">
              {logsFor} — logs
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-[11px] overflow-auto max-h-[60vh]">
            {logs ? (
              logs.lines.length > 0 ? (
                logs.lines.map((line, i) => <div key={i}>{line}</div>)
              ) : (
                <div className="text-gray-400">No log lines available.</div>
              )
            ) : (
              <div className="text-gray-400">Loading…</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">
        {label}
      </span>
      <span className={`text-[var(--bot-navy)] font-semibold truncate ${small ? "text-xs" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}
