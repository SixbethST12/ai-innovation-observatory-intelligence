/**
 * ManageTopics.tsx — Admin: view, add, and delete topic categories.
 */
import { useEffect, useState } from "react";
import {
  Tags, Plus, Trash2, Info, TrendingUp, FileText, Sparkles, Loader2, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getTopics, addTopic, removeTopic, getTrends,
  type TopicRow, type TopicCount,
} from "@/lib/api";

export default function ManageTopics() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [counts, setCounts] = useState<TopicCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [t, c] = await Promise.all([
        getTopics(),
        getTrends().catch(() => [] as TopicCount[]),
      ]);
      setTopics(t);
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    const autoSlug = slug.trim() || label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!autoSlug) {
      setError("Could not generate slug");
      return;
    }
    setSaving(true);
    try {
      await addTopic({
        slug: autoSlug,
        label: label.trim(),
        keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      });
      showFlash(`Topic "${label.trim()}" added`);
      setSlug("");
      setLabel("");
      setKeywords("");
      setShowAdd(false);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add topic");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string, name: string) {
    if (!confirm(`Delete topic "${name}"?`)) return;
    try {
      await removeTopic(slug);
      showFlash(`Deleted "${name}"`);
      await refresh();
    } catch (err: unknown) {
      showFlash(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const countMap: Record<string, number> = {};
  counts.forEach(c => { countMap[c.topic] = c.count; });

  const sorted = [...topics].sort(
    (a, b) => (countMap[b.slug] || 0) - (countMap[a.slug] || 0)
  );

  const totalPubs = counts.reduce((s, c) => s + c.count, 0);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading topics…</div>;

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
            Manage Topics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add, view, and remove topic categories used by the AI classifier
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(v => !v)}
          className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
        >
          <Plus size={14} /> {showAdd ? "Cancel" : "Add topic"}
        </Button>
      </div>

      {/* Info banner */}
      <Card className="mb-6 border-[var(--bot-gold-light)] bg-[var(--bot-gold-soft)]">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--bot-gold)] text-white flex items-center justify-center flex-shrink-0">
            <Info size={18} />
          </div>
          <div className="text-xs text-gray-700 leading-relaxed">
            Topics are stored in the database. Changes take effect immediately —
            new publications will be classified into the updated list. Built-in
            topics cannot be deleted.
          </div>
        </CardContent>
      </Card>

      {/* Add form */}
      {showAdd && (
        <Card className="mb-6 border-[var(--bot-navy)]">
          <CardHeader>
            <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
              <Plus size={14} /> New Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Label *
                </label>
                <Input
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); setError(""); }}
                  placeholder="e.g. Central Bank Digital Currency"
                  className="mt-1.5"
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Slug (optional)
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated from label"
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Keywords (comma-separated)
                </label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="cbdc, digital currency, central bank digital"
                  className="mt-1.5"
                />
              </div>
              {error && (
                <div className="col-span-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}
                  className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? "Saving…" : "Add topic"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Tags size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total Topics</div>
              <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">{topics.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Active</div>
              <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">
                {topics.filter(t => (countMap[t.slug] || 0) > 0).length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Classified Pubs</div>
              <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">{totalPubs}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] text-[var(--bot-navy)] font-bold flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--bot-gold-dark)]" />
            All Topics (sorted by usage)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="text-left py-3 font-bold w-[3%]">#</th>
                <th className="text-left py-3 font-bold w-[22%]">Topic</th>
                <th className="text-left py-3 font-bold w-[12%]">Slug</th>
                <th className="text-left py-3 font-bold w-[10%]">Pubs</th>
                <th className="text-left py-3 font-bold">Keywords</th>
                <th className="text-right py-3 pr-2 font-bold w-[8%]">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const count = countMap[t.slug] || 0;
                const total = counts.reduce((s, c) => s + c.count, 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <tr key={t.slug} className="border-b border-gray-50 transition-colors hover:bg-[var(--bot-gold-soft)]">
                    <td className="py-3.5 text-[12px] text-gray-400 font-bold">{i + 1}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-[var(--bot-navy)]">{t.label}</span>
                        {t.is_builtin && (
                          <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[9px] font-bold">
                            <Shield size={9} className="inline mr-0.5" /> built-in
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <code className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {t.slug}
                      </code>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-[var(--bot-navy)]">{count}</span>
                        <span className="text-[11px] text-gray-500 font-semibold">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {t.keywords.slice(0, 4).map(k => (
                          <Badge key={k} variant="outline" className="text-[10.5px] font-semibold border-blue-200 bg-blue-50 text-blue-700">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      {!t.is_builtin ? (
                        <button
                          onClick={() => handleDelete(t.slug, t.label)}
                          className="text-gray-400 hover:text-red-500 transition p-1"
                          title="Delete topic"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-300" title="Built-in topics cannot be deleted">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
