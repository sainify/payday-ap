import React, { useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { useBudgets, useCategories, mutate } from "@/hooks/useData";
import clsx from "clsx";

export default function Budgets() {
  const { data, loading, reload } = useBudgets();
  const { data: categories } = useCategories("expense");
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const budgetedIds = useMemo(() => new Set((data?.items || []).map((b) => b.category_id)), [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate("/budgets", "POST", { category_id: categoryId, limit_amount: Number(amount) });
      setAmount("");
      setCategoryId("");
      setOpen(false);
      reload();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    await mutate(`/budgets/${id}`, "DELETE");
    reload();
  }

  return (
    <div className="pb-28">
      <TopBar title="Category Budgets" subtitle="Set limits for your salary cycle" back right={
        <button onClick={() => setOpen(true)} className="h-10 w-10 rounded-clay-sm bg-primary text-white flex items-center justify-center clay-pressable" aria-label="Add budget"><Plus size={18} /></button>
      } />
      <div className="px-5 space-y-3">
        <ClayCard>
          <p className="text-sm text-ink-faint">Budgets automatically reset with your salary cycle. They do not remove money from your balance; they warn you when a category is getting too high.</p>
        </ClayCard>

        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && (data?.items.length ?? 0) === 0 && (
          <ClayCard><p className="text-sm text-ink-faint text-center py-5">No category budgets yet. Add your first spending limit.</p></ClayCard>
        )}

        {data?.items.map((b) => {
          const pct = Math.min(100, Math.max(0, b.percent_used));
          const exceeded = b.percent_used >= 100;
          const near = b.percent_used >= 80 && !exceeded;
          return (
            <ClayCard key={b.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-clay-sm clay-inset flex items-center justify-center text-xl">{b.category_icon || "💳"}</div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{b.category_name}</div>
                    <div className={clsx("text-xs flex items-center gap-1 mt-0.5", exceeded ? "text-coral" : near ? "text-amber" : "text-mint")}>{exceeded ? <AlertTriangle size={12}/> : <CheckCircle2 size={12}/>} {Math.round(b.percent_used)}% used</div>
                  </div>
                </div>
                <button onClick={() => remove(b.id)} className="h-9 w-9 rounded-clay-sm clay-inset text-ink-faint flex items-center justify-center" aria-label="Delete budget"><Trash2 size={15}/></button>
              </div>
              <div className="h-2.5 rounded-full clay-inset overflow-hidden mb-3"><div className={clsx("h-full rounded-full transition-all", exceeded ? "bg-coral" : near ? "bg-amber" : "bg-primary")} style={{ width: `${pct}%` }} /></div>
              <div className="flex items-end justify-between text-sm">
                <div><div className="text-ink-faint text-xs">Spent</div><Amount value={b.spent} size="sm" /></div>
                <div className="text-right"><div className="text-ink-faint text-xs">Budget</div><Amount value={b.limit_amount} size="sm" /></div>
              </div>
            </ClayCard>
          );
        })}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Set category budget">
        <form onSubmit={save}>
          <ClaySelect label="Expense category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Choose category</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}{budgetedIds.has(c.id) ? " · update" : ""}</option>)}
          </ClaySelect>
          <ClayInput label="Budget per salary cycle (₹)" type="number" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <ClayButton type="submit" fullWidth disabled={busy}>{busy ? "Saving…" : "Save Budget"}</ClayButton>
        </form>
      </Sheet>
    </div>
  );
}
