/**
 * ManageSources.tsx — View and manage the monitored data sources.
 */
import { useEffect, useState } from "react";
import { Database, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminSources, type AdminSource } from "@/lib/api";

export default function ManageSources() {
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminSources().then(setSources).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Manage Sources
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitored central banking and financial-sector information sources
        </p>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="text-xs text-amber-800 p-4 leading-relaxed">
          <strong>Note:</strong> Source add/remove is a planned backend feature.
          The 4 sources below are hard-coded in the collector layer
          (<code className="bg-amber-100 px-1 rounded">backend/app/collectors/</code>).
          Editing them from the UI requires backend source-config support.
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading sources…</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {sources.map(s => (
            <Card key={s.name}>
              <CardHeader>
                <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database size={16} className="text-[var(--bot-gold-dark)]" />
                    {s.name}
                  </span>
                  <Badge className="bg-green-100 text-green-700 border-green-200 border font-bold">
                    Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">
                      Method
                    </div>
                    <div className="text-sm text-[var(--bot-navy)] font-semibold mt-0.5">
                      {s.method}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">
                      URL
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {s.url} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
