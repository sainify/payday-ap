import React, { useState } from "react";
import { Plus, Repeat2, CreditCard, Pause, Play, Check, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { useRecurring, useCategories, mutate } from "@/hooks/useData";
import { toISODate } from "@/lib/cycle";
import clsx from "clsx";

type Tab = "all" | "expense" | "subscription";

export default function Recurring() {
  const [tab, setTab] = useState<Tab>("all");
  const { data, loading, reload } = useRecurring(tab === "all" ? undefined : tab);
  const { data: categories } = useCategories("expense");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [date, setDate] = useState(toISODate(new Date()));
  const [isSubscription, setIsSubscription] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await mutate("/recurring", "POST", { title, amount: Number(amount), category_id: categoryId || null, frequency, next_due_date: date, is_subscription: isSubscription });
      setTitle(""); setAmount(""); setCategoryId(""); setIsSubscription(false); setOpen(false); reload();
    } finally { setBusy(false); }
  }
  async function logNow(id: string) { await mutate(`/recurring/${id}/log`, "POST"); reload(); }
  async function toggle(id: string, active: number) { await mutate(`/recurring/${id}`, "PATCH", { active: active ? 0 : 1 }); reload(); }
  async function remove(id: string) { await mutate(`/recurring/${id}`, "DELETE"); reload(); }

  return (
    <div className="pb-28">
      <TopBar title="Recurring & Subscriptions" subtitle="Bills that keep coming back" back right={<button onClick={() => setOpen(true)} className="h-10 w-10 rounded-clay-sm bg-primary text-white flex items-center justify-center clay-pressable"><Plus size={18}/></button>} />
      <div className="px-5 space-y-4">
        <div className="flex gap-2">{(["all","expense","subscription"] as Tab[]).map((t) => <button key={t} onClick={() => setTab(t)} className={clsx("px-3 py-2 rounded-clay-sm text-xs font-semibold capitalize", tab === t ? "bg-primary text-white shadow-clay-raised-sm" : "clay-surface-sm text-ink-soft")}>{t === "expense" ? "Recurring" : t}</button>)}</div>
        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && (data?.length ?? 0) === 0 && <ClayCard><p className="text-sm text-ink-faint text-center py-5">Nothing recurring yet.</p></ClayCard>}
        {data?.map((r) => (
          <ClayCard key={r.id} className={clsx(!r.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={clsx("h-11 w-11 rounded-clay-sm flex items-center justify-center", r.is_subscription ? "bg-primary-soft text-primary" : "bg-amber-soft text-amber")}>{r.is_subscription ? <CreditCard size={19}/> : <Repeat2 size={19}/>}</div>
                <div className="min-w-0"><div className="font-semibold truncate">{r.title}</div><div className="text-xs text-ink-faint capitalize">{r.frequency} · next {new Date(`${r.next_due_date}T00:00:00`).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</div></div>
              </div>
              <Amount value={r.amount} size="sm" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button disabled={!r.active} onClick={() => logNow(r.id)} className="clay-inset py-2 rounded-clay-sm text-xs font-semibold text-mint flex items-center justify-center gap-1 disabled:opacity-40"><Check size={13}/> Log</button>
              <button onClick={() => toggle(r.id, r.active)} className="clay-inset py-2 rounded-clay-sm text-xs font-semibold flex items-center justify-center gap-1">{r.active ? <Pause size={13}/> : <Play size={13}/>} {r.active ? "Pause" : "Resume"}</button>
              <button onClick={() => remove(r.id)} className="clay-inset py-2 rounded-clay-sm text-xs font-semibold text-coral flex items-center justify-center gap-1"><Trash2 size={13}/> Delete</button>
            </div>
          </ClayCard>
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add recurring expense">
        <form onSubmit={save}>
          <ClayInput label="Name" required placeholder="Netflix, Rent, Gym…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <ClayInput label="Amount (₹)" type="number" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <ClaySelect label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Uncategorised</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</ClaySelect>
          <ClaySelect label="Repeats" value={frequency} onChange={(e) => setFrequency(e.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></ClaySelect>
          <ClayInput label="Next due date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="flex items-center justify-between clay-inset px-4 py-3 mb-5 rounded-clay-sm"><span className="text-sm font-medium">This is a subscription</span><input type="checkbox" checked={isSubscription} onChange={(e) => setIsSubscription(e.target.checked)} className="h-5 w-5 accent-primary" /></label>
          <ClayButton type="submit" fullWidth disabled={busy}>{busy ? "Saving…" : "Save Recurring Item"}</ClayButton>
        </form>
      </Sheet>
    </div>
  );
}
