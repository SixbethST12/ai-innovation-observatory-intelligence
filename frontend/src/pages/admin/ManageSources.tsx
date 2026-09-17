/**
 * ManageSources.tsx — View built-in + user-added RSS sources.
 *
 * SECTIONS:
 *   1. Built-in Sources (read-only) — BIS, IMF, World Bank, CBK
 *   2. User Sources — Add / Test / Delete RSS feeds
 *   3. Add form with test preview
 */
import { useEffect, useState } from "react";
import {
  Database, ExternalLink, Plus, Trash2, CheckCircle2, XCircle,
  Loader2, RefreshCw, Link as LinkIcon, Globe, Rss,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getUserSources, addUserSource, deleteUserSource, testSource,
  getAdminSources, triggerCollect,
  type UserSource, type AdminSource, type SourceTest,
} from "@/lib/api";

const BUILTIN_METHOD_STYLES: Record<string, string> = {
  "RSS": "bg-blue-50 text-blue-700 border-blue-200",
  "REST API": "bg-purple-50 text-purple-700 border-purple-200",
  "RSS (via RSS Parrot)": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function ManageSources() {
  const [builtin, setBuiltin] = useState<AdminSource[]>([]);
  const [userSources, setUserSources] = useState<UserSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Add-source form
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SourceTest | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [b, u] = await Promise.all([
        getAdminSources(),
        getUserSources().catch(() => [] as UserSource[]),
      ]);
      setBuiltin(b);
      setUserSources(u);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  async function handleTest() {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const res = await testSource({ name: name.trim() || "test", url: url.trim() });
      setTestResult(res);
    } catch (e) {
      setTestResult({ ok: false, error: String(e) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addUserSource({ name: name.trim(), url: url.trim() });
      showFlash(`Source "${name.trim()}" added`);
      setName("");
      setUrl("");
      setTestResult(null);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add source";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, sourceName: string) {
    if (!confirm(`Delete source "${sourceName}"? Existing publications remain.`)) return;
    try {
      await deleteUserSource(id);
      showFlash(`Deleted "${sourceName}"`);
      await refresh();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCollect() {
    setCollecting(true);
    try {
      await triggerCollect();
      showFlash("Collection started — refresh in 30s to see results");
    } finally {
      setTimeout(() => setCollecting(false), 2000);
    }
  }

  return (
    <div>
      {flash && (
        <div className="fixed top-24 right-8 bg-[var(--bot-navy)] text-white px-5 py-3 rounded-lg shadow-lg z-50 font-semibold text-sm">
          {flash}
        </div>
      )}

      {/* Page head */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
            Manage Sources
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View built-in sources and add custom RSS feeds
          </p>
        </div>
        <Button
          onClick={handleCollect}
          disabled={collecting}
          className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
        >
          <RefreshCw size={14} className={collecting ? "animate-spin" : ""} />
          {collecting ? "Running…" : "Run collection now"}
        </Button>
      </div>

      {/* Built-in sources */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-[var(--bot-gold-dark)]" />
          <h2 className="text-base font-extrabold text-[var(--bot-navy)]">Built-in Sources</h2>
          <span className="text-xs text-gray-500 font-semibold">({builtin.length})</span>
          <Badge variant="outline" className="text-[10px] font-bold ml-auto">
            Read-only · defined in code
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {builtin.map(s => (
            <Card key={s.name} className="transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bot-gold-soft)] text-[var(--bot-gold-dark)] flex items-center justify-center flex-shrink-0">
                      <Database size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--bot-navy)]">{s.name}</div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        {s.url} <ExternalLink size={10} className="flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${BUILTIN_METHOD_STYLES[s.method] || "bg-gray-50 text-gray-700"}`}>
                    {s.method}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Two column: Add form + User sources */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-5">
        {/* Add form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Plus size={14} /> Add RSS Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Source name
              </label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="e.g. Bank of England"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                RSS feed URL
              </label>
              <Input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTestResult(null); setError(""); }}
                placeholder="https://example.com/rss"
                className="mt-1.5"
              />
              <div className="text-[10.5px] text-gray-400 mt-1">
                Must be a standard RSS 2.0 or Atom feed
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={!url.trim() || testing}
                className="flex-1"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Rss size={14} />}
                {testing ? "Testing…" : "Test feed"}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!name.trim() || !url.trim() || saving || !testResult?.ok}
                className="flex-1 bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
              >
                <Plus size={14} />
                {saving ? "Saving…" : "Add source"}
              </Button>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`rounded-lg p-3 text-xs border ${
                testResult.ok
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}>
                {testResult.ok ? (
                  <>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <CheckCircle2 size={14} /> Feed is valid
                    </div>
                    <div className="opacity-80">
                      {testResult.entries} {testResult.entries === 1 ? "entry" : "entries"} found
                      {testResult.title && <> · "{testResult.title}"</>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <XCircle size={14} /> Feed failed
                    </div>
                    <div className="opacity-80">{testResult.error || "Could not parse this URL as an RSS feed"}</div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg p-3 text-xs bg-red-50 border border-red-200 text-red-800">
                {error}
              </div>
            )}

            <div className="text-[10.5px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
              <strong>Tip:</strong> Test the feed first — the Add button enables only when the URL responds with valid entries.
            </div>
          </CardContent>
        </Card>

        {/* User sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Globe size={14} /> Custom Sources ({userSources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading…</div>
            ) : userSources.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Rss size={40} className="mx-auto text-gray-300 mb-3" />
                <div className="text-sm font-semibold mb-1">No custom sources yet</div>
                <div className="text-xs">
                  Add any central bank RSS feed to monitor it here.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {userSources.map(s => (
                  <div
                    key={s.id}
                    className="border border-gray-100 rounded-lg p-4 flex items-start gap-3 transition-all hover:border-[var(--bot-gold)]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <Rss size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-[var(--bot-navy)]">
                          {s.name}
                        </span>
                        <Badge className="bg-green-50 text-green-700 border-green-200 border text-[10px] font-bold">
                          Active
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {s.method.toUpperCase()}
                        </Badge>
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 truncate"
                      >
                        {s.url} <ExternalLink size={10} className="flex-shrink-0" />
                      </a>
                      <div className="text-[10.5px] text-gray-400 mt-1">
                        Added {s.added_at
                          ? new Date(s.added_at).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="text-gray-400 hover:text-red-500 transition p-1.5"
                      title="Delete source"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {userSources.length > 0 && (
              <div className="text-[10.5px] text-gray-400 mt-4 pt-3 border-t border-gray-100 leading-relaxed">
                Custom sources are collected on every run alongside the 4 built-ins.
                Deleting a source does not remove its previously collected publications.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
