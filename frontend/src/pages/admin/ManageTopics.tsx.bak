/**
 * ManageTopics.tsx — View the 11 canonical topic categories.
 *
 * Topics are defined in backend/app/topics.py. This page is read-only
 * by design — see the note at the top for why.
 */
import { useEffect, useState } from "react";
import {
  Tags, ExternalLink, Info, TrendingUp, FileText, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminTopics, getTrends, type AdminTopic, type TopicCount } from "@/lib/api";

export default function ManageTopics() {
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [counts, setCounts] = useState<TopicCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminTopics(),
      getTrends().catch(() => [] as TopicCount[]),
    ])
      .then(([t, c]) => {
        setTopics(t);
        setCounts(c);
      })
      .finally(() => setLoading(false));
  }, []);

  // Map slug → count
  const countMap: Record<string, number> = {};
  counts.forEach(c => { countMap[c.topic] = c.count; });

  // Sort topics by count desc
  const sorted = [...topics].sort(
    (a, b) => (countMap[b.slug] || 0) - (countMap[a.slug] || 0)
  );

  const totalPubs = counts.reduce((s, c) => s + c.count, 0);
  const activeTopics = topics.filter(t => (countMap[t.slug] || 0) > 0).length;

  if (loading) return <div className="text-center py-20 text-gray-500">Loading topics…</div>;

  return (
    <div>
      {/* Page head */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Manage Topics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          The {topics.length} canonical topic categories used for classification and filtering
        </p>
      </div>

      {/* Info banner */}
      <Card className="mb-6 border-[var(--bot-gold-light)] bg-[var(--bot-gold-soft)]">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--bot-gold)] text-white flex items-center justify-center flex-shrink-0">
            <Info size={18} />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-[var(--bot-navy)] mb-1">
              Topics are code-defined
            </div>
            <div className="text-xs text-gray-700 leading-relaxed">
              These 11 topics live in <code className="bg-white px-1.5 py-0.5 rounded font-mono text-[11px]">backend/app/topics.py</code>.
              Changing them requires editing the file and restarting the backend — that's
              intentional, because the AI classifier validates its output against this exact list.
            </div>
            <a
              href="https://github.com/SixbethST12/ai-innovation-observatory-intelligence/blob/main/backend/app/topics.py"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:underline mt-2"
            >
              View topics.py on GitHub <ExternalLink size={11} />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Tags size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total Topics</div>
              <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">
                {topics.length}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Active Topics</div>
              <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">
                {activeTopics}
              </div>
              <div className="text-[10.5px] text-gray-500 mt-1">with ≥1 publication</div>
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
              <div className="text-2xl font-extrabold text-[var(--bot-navy)] leading-none mt-1">
                {totalPubs}
              </div>
              <div className="text-[10.5px] text-gray-500 mt-1">topic mentions</div>
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
                <th className="text-left py-3 font-bold w-[25%]">Topic</th>
                <th className="text-left py-3 font-bold w-[12%]">Slug</th>
                <th className="text-left py-3 font-bold w-[12%]">Publications</th>
                <th className="text-left py-3 font-bold">Keywords</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const count = countMap[t.slug] || 0;
                const total = counts.reduce((s, c) => s + c.count, 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <tr
                    key={t.slug}
                    className="border-b border-gray-50 transition-colors hover:bg-[var(--bot-gold-soft)]"
                  >
                    <td className="py-3.5 text-[12px] text-gray-400 font-bold">
                      {i + 1}
                    </td>
                    <td className="py-3.5">
                      <div className="text-[13.5px] font-bold text-[var(--bot-navy)]">
                        {t.label}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <code className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {t.slug}
                      </code>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-[var(--bot-navy)]">
                          {count}
                        </span>
                        <span className="text-[11px] text-gray-500 font-semibold">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {t.keywords.map(k => (
                          <Badge
                            key={k}
                            variant="outline"
                            className="text-[10.5px] font-semibold border-blue-200 bg-blue-50 text-blue-700"
                          >
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-[10.5px] text-gray-400 mt-4 pt-3 border-t border-gray-100 leading-relaxed">
            Keywords are used to build source queries and validate classification output.
            To add, remove, or edit topics, modify{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded">backend/app/topics.py</code>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
