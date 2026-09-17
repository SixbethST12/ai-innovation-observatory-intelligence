/**
 * ManagePublications.tsx — Admin: control the publication corpus.
 *
 * FEATURES:
 *   - Filter tabs: All / Pending AI / Fallback / Hidden / Manual
 *   - Search + source filter
 *   - Multi-select rows with bulk actions:
 *     - Re-run AI
 *     - Hide
 *     - Unhide
 *   - Add manual publication (title + URL + optional abstract)
 *
 * NO DELETE — use Hide instead (non-destructive).
 */
import { useEffect, useState, useMemo } from "react";
import {
  FileText, Search as SearchIcon, RefreshCw, EyeOff, Eye, Plus,
  Loader2, AlertTriangle, CheckCircle2, ExternalLink, Sparkles, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  getAdminPubs, bulkResetAI, bulkHide, bulkUnhide, createManualPub,
  getInstitutions,
  type AdminPubRow, type InstitutionCount,
} from "@/lib/api";

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Pending AI" },
  { key: "fallback", label: "Fallback" },
  { key: "hidden",   label: "Hidden" },
  { key: "manual",   label: "Manual" },
];

export default function ManagePublications() {
  const [pubs, setPubs] = useState<AdminPubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [source, setSource] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionCount[]>([]);

  // Manual add drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", institution: "Manual", source_url: "",
    published_date: "", abstract: "", run_ai: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const [rows, inst] = await Promise.all([
        getAdminPubs({ filter, source, q, limit: 300 }),
        getInstitutions().catch(() => []),
      ]);
      setPubs(rows);
      setInstitutions(inst);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [filter, source]);

  useEffect(() => {
    const id = setTimeout(refresh, 400);
    return () => clearTimeout(id);
  }, [q]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === pubs.length) setSelected(new Set());
    else setSelected(new Set(pubs.map(p => p.id)));
  }

  async function handleReRun() {
    if (selected.size === 0) return;
    setBusy("reset");
    try {
      const res = await bulkResetAI([...selected]);
      showFlash(`${res.reset} publication(s) queued for AI reprocessing`);
      await refresh();
    } finally { setBusy(null); }
  }

  async function handleHide() {
    if (selected.size === 0) return;
    setBusy("hide");
    try {
      const res = await bulkHide([...selected]);
      showFlash(`${res.hidden} publication(s) hidden`);
      await refresh();
    } finally { setBusy(null); }
  }

  async function handleUnhide() {
    if (selected.size === 0) return;
    setBusy("unhide");
    try {
      const res = await bulkUnhide([...selected]);
      showFlash(`${res.unhidden} publication(s) restored`);
      await refresh();
    } finally { setBusy(null); }
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim() || !form.source_url.trim()) {
      setFormError("Title and source URL are required");
      return;
    }
    setSaving(true);
    try {
      await createManualPub({
        title: form.title.trim(),
        institution: form.institution.trim() || "Manual",
        source_url: form.source_url.trim(),
        published_date: form.published_date || undefined,
        abstract: form.abstract || undefined,
        run_ai: form.run_ai,
      });
      showFlash("Publication added");
      setForm({ title: "", institution: "Manual", source_url: "", published_date: "", abstract: "", run_ai: true });
      setDrawerOpen(false);
      await refresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  // Stats
  const stats = useMemo(() => ({
    total: pubs.length,
    pending: pubs.filter(p => !p.ai_processed).length,
    fallback: pubs.filter(p => p.ai_engine === "rule-based").length,
    hidden: pubs.filter(p => p.hidden).length,
    manual: pubs.filter(p => p.manual).length,
  }), [pubs]);

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
            Manage Publications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Control the publication corpus — reprocess, hide, or add manual entries
          </p>
        </div>
        <Button
          onClick={() => setDrawerOpen(true)}
          className="bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]"
        >
          <Plus size={14} /> Add manually
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatBox label="Total" value={stats.total} color="#1e40af" />
        <StatBox label="Pending AI" value={stats.pending} color="#b45309" />
        <StatBox label="Fallback" value={stats.fallback} color="#7c3aed" />
        <StatBox label="Hidden" value={stats.hidden} color="#dc2626" />
        <StatBox label="Manual" value={stats.manual} color="#0d9488" />
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter tabs */}
            <div className="flex gap-1.5">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    filter === f.key
                      ? "bg-[var(--bot-navy)] text-white border-[var(--bot-navy)]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[var(--bot-gold)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-[200px] relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by title…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm font-semibold text-[var(--bot-navy)] hover:border-[var(--bot-gold)] cursor-pointer"
            >
              <option value="all">All sources</option>
              {institutions.map(i => (
                <option key={i.institution} value={i.institution}>{i.institution}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-[var(--bot-navy)] text-white rounded-lg px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" onClick={handleReRun} disabled={busy === "reset"}
              className="bg-white text-[var(--bot-navy)] hover:bg-gray-100">
              {busy === "reset" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Re-run AI
            </Button>
            <Button size="sm" onClick={handleHide} disabled={busy === "hide"}
              className="bg-white text-[var(--bot-navy)] hover:bg-gray-100">
              {busy === "hide" ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
              Hide
            </Button>
            <Button size="sm" onClick={handleUnhide} disabled={busy === "unhide"}
              className="bg-white text-[var(--bot-navy)] hover:bg-gray-100">
              {busy === "unhide" ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              Unhide
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}
              className="text-white hover:bg-white/10">
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-gray-500">Loading publications…</div>
          ) : pubs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No publications match the current filter.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="w-10 pl-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === pubs.length && pubs.length > 0}
                      onChange={toggleSelectAll}
                      className="accent-[var(--bot-navy)]"
                    />
                  </th>
                  <th className="text-left py-3 font-bold w-[50%]">Title</th>
                  <th className="text-left py-3 font-bold">Source</th>
                  <th className="text-left py-3 font-bold">Date</th>
                  <th className="text-left py-3 font-bold">Status</th>
                  <th className="text-right pr-4 py-3 font-bold">Link</th>
                </tr>
              </thead>
              <tbody>
                {pubs.map(p => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-50 transition-colors ${
                      p.hidden ? "bg-gray-50 opacity-70" : "hover:bg-[var(--bot-gold-soft)]"
                    }`}
                  >
                    <td className="pl-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-[var(--bot-navy)]"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="text-[13px] font-bold text-[var(--bot-navy)] leading-snug line-clamp-2">
                        {p.title}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-bold text-[10.5px]">
                        {p.institution}
                      </Badge>
                    </td>
                    <td className="py-3 text-[11.5px] text-gray-500 whitespace-nowrap font-semibold">
                      {p.published_date ? new Date(p.published_date).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "2-digit",
                      }) : "—"}
                    </td>
                    <td className="py-3">
                      <StatusBadges pub={p} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <a href={p.source_url} target="_blank" rel="noreferrer"
                        className="inline-flex w-7 h-7 rounded-full hover:bg-blue-50 text-blue-600 items-center justify-center">
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="text-[10.5px] text-gray-400 text-center mt-4">
        Showing {pubs.length} publication{pubs.length === 1 ? "" : "s"}
      </div>

      {/* Add manual drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold text-[var(--bot-navy)] text-left">
              Add Publication Manually
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleAddManual} className="space-y-4 mt-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Title *
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Publication title"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Institution
                </label>
                <Input
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Published date
                </label>
                <Input
                  type="date"
                  value={form.published_date}
                  onChange={(e) => setForm({ ...form, published_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Source URL *
              </label>
              <Input
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://..."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Abstract / Summary
              </label>
              <textarea
                value={form.abstract}
                onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                placeholder="Optional — paste abstract or summary text"
                rows={6}
                className="mt-1.5 w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:border-[var(--bot-gold)]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.run_ai}
                onChange={(e) => setForm({ ...form, run_ai: e.target.checked })}
                className="accent-[var(--bot-navy)] w-4 h-4"
              />
              <span className="text-sm font-semibold text-[var(--bot-navy)]">
                Run AI pipeline on this publication now
              </span>
            </label>

            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2">
                {formError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}
                className="flex-1 bg-[var(--bot-navy)] hover:bg-[var(--bot-navy-dark)]">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? "Saving…" : "Add publication"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatusBadges({ pub }: { pub: AdminPubRow }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {pub.hidden && (
        <Badge className="bg-gray-200 text-gray-700 border-gray-300 border text-[10px] font-bold">
          Hidden
        </Badge>
      )}
      {pub.manual && (
        <Badge className="bg-teal-50 text-teal-700 border-teal-200 border text-[10px] font-bold">
          Manual
        </Badge>
      )}
      {!pub.ai_processed && (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] font-bold">
          Pending AI
        </Badge>
      )}
      {pub.ai_engine === "rule-based" && (
        <Badge className="bg-purple-50 text-purple-700 border-purple-200 border text-[10px] font-bold">
          Fallback
        </Badge>
      )}
      {pub.ai_processed && pub.ai_engine === "ollama" && (
        <Badge className="bg-green-50 text-green-700 border-green-200 border text-[10px] font-bold">
          <CheckCircle2 size={9} className="inline mr-0.5" /> AI
        </Badge>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
        <div className="text-[10.5px] uppercase tracking-wide text-gray-500 font-bold mt-1">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
