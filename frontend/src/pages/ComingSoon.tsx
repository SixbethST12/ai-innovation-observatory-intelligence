import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[var(--bot-navy)] mb-6">{title}</h1>
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
          <Construction size={48} className="text-[var(--bot-gold)]" />
          <div className="text-lg font-semibold text-[var(--bot-navy)]">Coming soon</div>
          <p className="text-sm text-gray-500 max-w-md">
            This page is part of the roadmap. The core dashboard, publications,
            trends, and search features are already functional.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
