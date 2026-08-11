import React from "react";
import { Landmark } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { Amount } from "@/components/ui/Amount";
import { useSalaryHistory } from "@/hooks/useData";

export default function SalaryHistory() {
  const { data, loading } = useSalaryHistory();

  return (
    <div className="pb-28">
      <TopBar title="Salary History" subtitle="Every credit, in order" back />
      <div className="px-5 space-y-3">
        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && (data?.length ?? 0) === 0 && (
          <ClayCard>
            <p className="text-sm text-ink-faint text-center py-4">No salary entries yet.</p>
          </ClayCard>
        )}
        {data?.map((s) => (
          <ClayCard key={s.id} className="!p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center">
                <Landmark size={18} />
              </div>
              <div>
                <div className="font-medium text-sm">
                  {new Date(s.salary_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                {s.note && <div className="text-xs text-ink-faint">{s.note}</div>}
              </div>
            </div>
            <Amount value={s.amount} size="lg" />
          </ClayCard>
        ))}
      </div>
    </div>
  );
}
