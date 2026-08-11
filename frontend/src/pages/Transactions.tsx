import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { Amount } from "@/components/ui/Amount";
import { useTransactions } from "@/hooks/useData";
import clsx from "clsx";

type FilterType = "all" | "expense" | "income";

export default function Transactions() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { data, loading } = useTransactions(filter === "all" ? undefined : { type: filter });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter(
      (t) => t.note?.toLowerCase().includes(q) || t.category_name?.toLowerCase().includes(q)
    );
  }, [data, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const t of filtered) {
      const day = new Date(t.txn_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      groups[day] = groups[day] || [];
      groups[day].push(t);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="pb-28">
      <TopBar title="Transactions" subtitle="Every rupee, tracked" />
      <div className="px-5 space-y-4">
        <div className="flex items-center gap-2 clay-inset px-4 py-3">
          <Search size={18} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by note or category"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <SlidersHorizontal size={16} className="text-ink-faint" />
        </div>

        <div className="flex gap-2">
          {(["all", "expense", "income"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-4 py-2 rounded-clay-sm text-sm font-semibold capitalize transition-all",
                filter === f ? "bg-primary text-white shadow-clay-raised-sm" : "clay-surface-sm text-ink-soft"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-ink-faint px-1">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <ClayCard>
            <p className="text-sm text-ink-faint text-center py-4">
              No transactions yet. Tap the + button to log your first one.
            </p>
          </ClayCard>
        )}

        {Object.entries(grouped).map(([day, txns]) => (
          <div key={day}>
            <div className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2 px-1">{day}</div>
            <ClayCard className="!p-2 space-y-1">
              {txns.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        "h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0",
                        t.type === "expense" ? "bg-coral-soft text-coral" : "bg-mint-soft text-mint"
                      )}
                    >
                      {t.type === "expense" ? <TrendingDown size={17} /> : <TrendingUp size={17} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {t.note || t.category_name || "Transaction"}
                      </div>
                      <div className="text-xs text-ink-faint">{t.category_name || "Uncategorised"}</div>
                    </div>
                  </div>
                  <Amount
                    value={t.type === "expense" ? -t.amount : t.amount}
                    sign
                    size="sm"
                    className={t.type === "expense" ? "text-coral" : "text-mint"}
                  />
                </div>
              ))}
            </ClayCard>
          </div>
        ))}
      </div>
    </div>
  );
}
