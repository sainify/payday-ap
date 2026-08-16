import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, TrendingDown, TrendingUp, X } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { useTransactions, useCategories, type TransactionFilters } from "@/hooks/useData";
import clsx from "clsx";

type FilterType = "all" | "expense" | "income";

export default function Transactions() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<TransactionFilters>({});
  const { data: categories } = useCategories("expense");

  const params: TransactionFilters = {
    q: query || undefined,
    type: filter === "all" ? undefined : filter,
    ...advanced,
  };
  const { data, loading } = useTransactions(params);
  const filtered = data || [];
  const activeAdvanced = Object.values(advanced).some(Boolean);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const t of filtered) {
      const day = new Date(`${t.txn_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      groups[day] = groups[day] || [];
      groups[day].push(t);
    }
    return groups;
  }, [filtered]);

  function clearAdvanced() { setAdvanced({}); }

  return (
    <div className="pb-28">
      <TopBar title="Transactions" subtitle="Every rupee, tracked" />
      <div className="px-5 space-y-4">
        <div className="flex items-center gap-2 clay-inset px-4 py-3">
          <Search size={18} className="text-ink-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search note or category" className="flex-1 bg-transparent outline-none text-sm min-w-0" />
          {query && <button onClick={() => setQuery("")} className="text-ink-faint"><X size={15}/></button>}
          <button onClick={() => setAdvancedOpen(true)} className={clsx("relative", activeAdvanced ? "text-primary" : "text-ink-faint")} aria-label="Advanced filters"><SlidersHorizontal size={17} />{activeAdvanced && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"/>}</button>
        </div>

        <div className="flex gap-2">
          {(["all", "expense", "income"] as FilterType[]).map((f) => <button key={f} onClick={() => setFilter(f)} className={clsx("px-4 py-2 rounded-clay-sm text-sm font-semibold capitalize transition-all", filter === f ? "bg-primary text-white shadow-clay-raised-sm" : "clay-surface-sm text-ink-soft")}>{f}</button>)}
          {activeAdvanced && <button onClick={clearAdvanced} className="ml-auto text-xs font-semibold text-coral">Clear filters</button>}
        </div>

        {activeAdvanced && <ClayCard className="!p-3"><div className="text-xs text-ink-faint flex flex-wrap gap-x-3 gap-y-1">{advanced.category && <span>Category filtered</span>}{advanced.from && <span>From {advanced.from}</span>}{advanced.to && <span>To {advanced.to}</span>}{advanced.min && <span>Min ₹{advanced.min}</span>}{advanced.max && <span>Max ₹{advanced.max}</span>}</div></ClayCard>}

        {loading && <p className="text-sm text-ink-faint px-1">Loading…</p>}
        {!loading && filtered.length === 0 && <ClayCard><p className="text-sm text-ink-faint text-center py-4">No transactions match these filters.</p></ClayCard>}

        {Object.entries(grouped).map(([day, txns]) => <div key={day}>
          <div className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2 px-1">{day}</div>
          <ClayCard className="!p-2 space-y-1">{txns.map((t) => <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0"><div className={clsx("h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0", t.type === "expense" ? "bg-coral-soft text-coral" : "bg-mint-soft text-mint")}>{t.type === "expense" ? <TrendingDown size={17} /> : <TrendingUp size={17} />}</div><div className="min-w-0"><div className="font-medium text-sm truncate">{t.note || t.category_name || "Transaction"}</div><div className="text-xs text-ink-faint">{t.category_name || "Uncategorised"}</div></div></div>
            <Amount value={t.type === "expense" ? -t.amount : t.amount} sign size="sm" className={t.type === "expense" ? "text-coral" : "text-mint"} />
          </div>)}</ClayCard>
        </div>)}
      </div>

      <Sheet open={advancedOpen} onClose={() => setAdvancedOpen(false)} title="Advanced Filters">
        <ClaySelect label="Expense category" value={advanced.category || ""} onChange={(e) => setAdvanced((p) => ({ ...p, category: e.target.value }))}><option value="">All categories</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</ClaySelect>
        <div className="grid grid-cols-2 gap-3"><ClayInput label="From" type="date" value={advanced.from || ""} onChange={(e) => setAdvanced((p) => ({...p, from: e.target.value}))}/><ClayInput label="To" type="date" value={advanced.to || ""} onChange={(e) => setAdvanced((p) => ({...p, to: e.target.value}))}/></div>
        <div className="grid grid-cols-2 gap-3"><ClayInput label="Min amount" type="number" min={0} value={advanced.min || ""} onChange={(e) => setAdvanced((p) => ({...p, min: e.target.value}))}/><ClayInput label="Max amount" type="number" min={0} value={advanced.max || ""} onChange={(e) => setAdvanced((p) => ({...p, max: e.target.value}))}/></div>
        <ClayButton fullWidth onClick={() => setAdvancedOpen(false)}>Apply Filters</ClayButton>
        {activeAdvanced && <ClayButton fullWidth variant="ghost" className="mt-2" onClick={() => { clearAdvanced(); setAdvancedOpen(false); }}>Clear All</ClayButton>}
      </Sheet>
    </div>
  );
}
