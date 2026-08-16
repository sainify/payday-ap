import React, { useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useEmergencyFund, mutate } from "@/hooks/useData";

export default function EmergencyFund() {
  const { data, loading, reload } = useEmergencyFund();
  const [targetOpen, setTargetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const progress = data?.target_amount ? Math.min(1, data.saved_amount / data.target_amount) : 0;

  async function saveTarget(e: React.FormEvent) { e.preventDefault(); await mutate("/emergency-fund", "PATCH", { target_amount: Number(target) }); setTarget(""); setTargetOpen(false); reload(); }
  async function add(e: React.FormEvent) { e.preventDefault(); await mutate("/emergency-fund/contribute", "POST", { amount: Number(amount) }); setAmount(""); setAddOpen(false); reload(); }

  return (
    <div className="pb-28">
      <TopBar title="Emergency Fund" subtitle="Your financial safety buffer" back />
      <div className="px-5 space-y-4">
        {loading ? <p className="text-sm text-ink-faint">Loading…</p> : (
          <ClayCard className="text-center">
            <div className="flex justify-center mb-4"><ProgressRing progress={progress} size={132} strokeWidth={10} progressClassName="stroke-mint"><div><ShieldCheck size={24} className="text-mint mx-auto mb-1"/><div className="font-display font-bold">{Math.round((data?.percent || 0))}%</div></div></ProgressRing></div>
            <div className="text-sm text-ink-faint">Saved</div><Amount value={data?.saved_amount || 0} size="xl" />
            <div className="text-sm text-ink-faint mt-1">Target <span className="text-ink dark:text-ink-inverted font-semibold"><Amount value={data?.target_amount || 0} size="sm" /></span></div>
            <div className="grid grid-cols-2 gap-3 mt-5"><ClayButton variant="neutral" onClick={() => setTargetOpen(true)}>{data?.target_amount ? "Change Target" : "Set Target"}</ClayButton><ClayButton onClick={() => setAddOpen(true)} disabled={!data?.target_amount}><span className="flex items-center justify-center gap-1"><Plus size={16}/> Add Money</span></ClayButton></div>
          </ClayCard>
        )}
        <ClayCard><h3 className="font-display font-semibold mb-2">How it works</h3><p className="text-sm text-ink-faint">Emergency contributions count as savings and reduce your available balance, so the money is treated as set aside instead of spendable.</p></ClayCard>
      </div>
      <Sheet open={targetOpen} onClose={() => setTargetOpen(false)} title="Emergency fund target"><form onSubmit={saveTarget}><ClayInput label="Target amount (₹)" type="number" min={1} required value={target} onChange={(e) => setTarget(e.target.value)} /><ClayButton type="submit" fullWidth>Save Target</ClayButton></form></Sheet>
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add to emergency fund"><form onSubmit={add}><ClayInput label="Amount (₹)" type="number" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)} /><ClayButton type="submit" fullWidth>Add to Fund</ClayButton></form></Sheet>
    </div>
  );
}
