import React, { useState } from "react";
import { Plus, Landmark, CheckCircle2, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { useDebts, mutate } from "@/hooks/useData";
import { Debt } from "@/types";
import { toISODate } from "@/lib/cycle";

export default function Debts() {
  const { data, loading, reload } = useDebts();
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<Debt | null>(null);
  const [title, setTitle] = useState(""); const [lender, setLender] = useState(""); const [principal, setPrincipal] = useState(""); const [outstanding, setOutstanding] = useState(""); const [emi, setEmi] = useState(""); const [interest, setInterest] = useState(""); const [due, setDue] = useState(toISODate(new Date())); const [payment, setPayment] = useState("");

  async function create(e: React.FormEvent) { e.preventDefault(); await mutate("/debts", "POST", { title, lender, principal_amount: Number(principal), outstanding_amount: outstanding ? Number(outstanding) : undefined, emi_amount: Number(emi || 0), interest_rate: Number(interest || 0), next_due_date: due || null }); setOpen(false); setTitle(""); setLender(""); setPrincipal(""); setOutstanding(""); setEmi(""); setInterest(""); reload(); }
  async function pay(e: React.FormEvent) { e.preventDefault(); if (!paying) return; await mutate(`/debts/${paying.id}/pay`, "POST", { amount: Number(payment) }); setPayment(""); setPaying(null); reload(); }
  async function remove(id: string) { await mutate(`/debts/${id}`, "DELETE"); reload(); }

  return (
    <div className="pb-28">
      <TopBar title="Debt & EMI Manager" subtitle="Know what you owe and what's next" back right={<button onClick={() => setOpen(true)} className="h-10 w-10 rounded-clay-sm bg-primary text-white flex items-center justify-center clay-pressable"><Plus size={18}/></button>} />
      <div className="px-5 space-y-3">
        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && (data?.length ?? 0) === 0 && <ClayCard><p className="text-sm text-ink-faint text-center py-5">No debts tracked. Add one only if you need it.</p></ClayCard>}
        {data?.map((d) => {
          const paidPct = d.principal_amount > 0 ? Math.min(100, ((d.principal_amount - d.outstanding_amount) / d.principal_amount) * 100) : 0;
          return <ClayCard key={d.id} className={d.status === "paid" ? "opacity-70" : ""}>
            <div className="flex items-start justify-between gap-3"><div className="flex gap-3 min-w-0"><div className="h-11 w-11 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center">{d.status === "paid" ? <CheckCircle2 size={19}/> : <Landmark size={19}/>}</div><div className="min-w-0"><div className="font-semibold truncate">{d.title}</div><div className="text-xs text-ink-faint">{d.lender || "Debt"}{d.next_due_date ? ` · due ${new Date(`${d.next_due_date}T00:00:00`).toLocaleDateString("en-IN", {day:"numeric",month:"short"})}` : ""}</div></div></div><button onClick={() => remove(d.id)} className="text-ink-faint"><Trash2 size={15}/></button></div>
            <div className="h-2 rounded-full clay-inset overflow-hidden my-4"><div className="h-full bg-mint rounded-full" style={{width:`${paidPct}%`}}/></div>
            <div className="grid grid-cols-2 gap-3"><div className="clay-inset px-3 py-2"><div className="text-[11px] text-ink-faint">Outstanding</div><Amount value={d.outstanding_amount} size="sm"/></div><div className="clay-inset px-3 py-2"><div className="text-[11px] text-ink-faint">EMI</div><Amount value={d.emi_amount} size="sm"/></div></div>
            {d.status === "active" && <ClayButton fullWidth className="mt-4" onClick={() => setPaying(d)}>Record Payment</ClayButton>}
          </ClayCard>;
        })}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add debt / loan"><form onSubmit={create}><ClayInput label="Loan / debt name" required value={title} onChange={(e)=>setTitle(e.target.value)}/><ClayInput label="Lender (optional)" value={lender} onChange={(e)=>setLender(e.target.value)}/><ClayInput label="Original principal (₹)" type="number" min={1} required value={principal} onChange={(e)=>setPrincipal(e.target.value)}/><ClayInput label="Current outstanding (₹, optional)" type="number" min={0} value={outstanding} onChange={(e)=>setOutstanding(e.target.value)}/><ClayInput label="EMI amount (₹)" type="number" min={0} value={emi} onChange={(e)=>setEmi(e.target.value)}/><ClayInput label="Interest rate % (optional)" type="number" min={0} step="0.01" value={interest} onChange={(e)=>setInterest(e.target.value)}/><ClayInput label="Next due date" type="date" value={due} onChange={(e)=>setDue(e.target.value)}/><ClayButton type="submit" fullWidth>Save Debt</ClayButton></form></Sheet>
      <Sheet open={!!paying} onClose={() => setPaying(null)} title={`Pay ${paying?.title || "debt"}`}><form onSubmit={pay}><ClayInput label="Payment amount (₹)" type="number" min={1} required value={payment} onChange={(e)=>setPayment(e.target.value)}/><ClayButton type="submit" fullWidth>Record Payment</ClayButton><p className="text-xs text-ink-faint mt-3 text-center">This also logs an expense under EMI & Loans.</p></form></Sheet>
    </div>
  );
}
