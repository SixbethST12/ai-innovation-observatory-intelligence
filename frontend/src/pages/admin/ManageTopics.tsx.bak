/**
 * ManageTopics.tsx — View the 11 canonical topic categories.
 */
import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminTopics, type AdminTopic } from "@/lib/api";

export default function ManageTopics() {
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminTopics().then(setTopics).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] tracking-tight">
          Manage Topics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          The 11 canonical topic categories used for classification and filtering
        </p>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="text-xs text-amber-800 p-4 leading-relaxed">
          <strong>Note:</strong> Editing topics is a planned backend feature.
          The list below is the single source of truth in
          <code className="bg-amber-100 px-1 rounded mx-1">backend/app/topics.py</code>
          and is consumed by collectors, the AI classifier, and the frontend.
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading topics…</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {topics.map(t => (
            <Card key={t.slug}>
              <CardHeader>
                <CardTitle className="text-[15px] text-[var(--bot-navy)] flex items-center gap-2">
                  <Tags size={16} className="text-[var(--bot-gold-dark)]" />
                  {t.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                  Slug
                </div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {t.slug}
                </code>

                <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mt-4 mb-2">
                  Keywords
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {t.keywords.map(k => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="text-[11px] border-blue-200 bg-blue-50 text-blue-700 font-medium"
                    >
                      {k}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
