/**
 * Alerts.tsx — Alerts and notifications UI.
 *
 * NOTE: Real-time alerting is NOT yet implemented in the backend.
 * This page shows the UI shell with a working "build rule" form,
 * a local list of user-created rules, and clear messaging that
 * automated alerts are a planned feature.
 */
import { useState } from "react";
import {
  Bell, AlertTriangle, Info, CheckCircle2, Plus, Trash2,
  Settings, ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("all");
  const [topic, setTopic] = useState("all");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setRules(prev => [
      ...prev,
      { id: Date.now(), keyword: keyword.trim(), source, topic, priority },
    ]);
    setKeyword("");
  }

  function removeRule(id: number) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div>
      {/* Page head */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Alerts & Notifications
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up rules to be notified about new developments in your areas of interest
        </p>
      </div>

      {/* Status notice */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-800">
              Automated alerting is a planned feature
            </div>
            <div className="text-xs text-amber-700 mt-1 leading-relaxed">
              This page shows the alert rule interface. Automated detection, delivery
              (email/in-app), and alert history are part of the roadmap. Rules you create
              here are stored in your browser session only.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <Stat icon={Bell}          label="Active Rules"     value={rules.length}                 color="#1e40af" />
        <Stat icon={ShieldAlert}   label="High Priority"    value={rules.filter(r => r.priority === "high").length}   color="#dc2626" />
        <Stat icon={Info}          label="Medium Priority"  value={rules.filter(r => r.priority === "medium").length} color="#b45309" />
        <Stat icon={CheckCircle2}  label="Low Priority"     value={rules.filter(r => r.priority === "low").length}    color="#16a34a" />
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-5">
        {/* Create rule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
              <Plus size={14} /> Create Alert Rule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addRule} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Keyword or phrase
                </label>
                <Input
                  placeholder="e.g. CBDC, stablecoin, instant payments"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Source</label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue>{source === "all" ? "Any source" : source}</SelectValue>
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
                      <SelectValue>
                        {topic === "all" ? "Any topic" : topic.replace(/_/g, " ")}
                      </SelectValue>
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
                      className={`flex-1 py-2 rounded-md text-xs font-bold capitalize border transition ${
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
                disabled={!keyword.trim()}
                className="w-full bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
              >
                <Plus size={14} /> Add Rule
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
              <Settings size={14} /> Active Rules ({rules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell size={40} className="mx-auto text-gray-300 mb-3" />
                <div className="text-sm font-semibold mb-1">No rules yet</div>
                <div className="text-xs">
                  Create your first alert rule on the left to be notified about new developments.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(r => (
                  <div key={r.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[var(--bot-navy)] truncate">
                          "{r.keyword}"
                        </div>
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {r.source !== "all" && (
                            <Badge variant="outline" className="text-xs">
                              {r.source}
                            </Badge>
                          )}
                          {r.topic !== "all" && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {r.topic.replace(/_/g, " ")}
                            </Badge>
                          )}
                          <Badge
                            className={`text-xs border ${
                              r.priority === "high"   ? "bg-red-100 text-red-700 border-red-200"
                              : r.priority === "medium" ? "bg-amber-100 text-amber-700 border-amber-200"
                              :                            "bg-green-100 text-green-700 border-green-200"
                            }`}
                          >
                            {r.priority}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRule(r.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                        title="Remove rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, color,
}: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
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
