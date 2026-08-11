import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useGoals, mutate } from "@/hooks/useData";
import { Goal } from "@/types";

export default function Goals() {
  const { data, loading, reload } = useGoals();
  const navigate = useNavigate();
  const [addFundsFor, setAddFundsFor] = useState<Goal | null>(null);

  return (
    <div className="pb-28">
      <TopBar
        title="Savings Goals"
        subtitle="What you're working towards"
        back
        right={
          <button
            onClick={() => navigate("/add/goal")}
            className="h-10 w-10 rounded-clay-sm bg-primary text-white flex items-center justify-center clay-pressable"
            aria-label="New goal"
          >
            <Plus size={18} />
          </button>
        }
      />
      <div className="px-5 space-y-3">
        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && (data?.length ?? 0) === 0 && (
          <ClayCard>
            <p className="text-sm text-ink-faint text-center py-4">No goals yet. Start one from the + button.</p>
          </ClayCard>
        )}
        {data?.map((g) => {
          const progress = g.target_amount > 0 ? g.saved_amount / g.target_amount : 0;
          return (
            <ClayCard key={g.id} className="flex items-center gap-4">
              <ProgressRing progress={progress} size={64} strokeWidth={7} progressClassName="stroke-mint">
                <span className="text-xs font-semibold tabular">{Math.round(progress * 100)}%</span>
              </ProgressRing>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{g.title}</div>
                <div className="text-sm text-ink-faint">
                  <Amount value={g.saved_amount} size="sm" /> of <Amount value={g.target_amount} size="sm" />
                </div>
              </div>
              <button
                onClick={() => setAddFundsFor(g)}
                className="text-xs font-semibold text-primary clay-surface-sm px-3 py-2 rounded-clay-sm clay-pressable shrink-0"
              >
                Add
              </button>
            </ClayCard>
          );
        })}
      </div>

      <AddFundsSheet goal={addFundsFor} onClose={() => setAddFundsFor(null)} onSaved={reload} />
    </div>
  );
}

function AddFundsSheet({ goal, onClose, onSaved }: { goal: Goal | null; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) return;
    setBusy(true);
    try {
      await mutate(`/goals/${goal.id}/contribute`, "POST", { amount: Number(amount) });
      setAmount("");
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!goal} onClose={onClose} title={`Add to "${goal?.title ?? ""}"`}>
      <form onSubmit={submit}>
        <ClayInput
          label="Amount (₹)"
          type="number"
          min={0}
          required
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <ClayButton type="submit" fullWidth disabled={busy}>
          {busy ? "Saving…" : "Add to goal"}
        </ClayButton>
      </form>
    </Sheet>
  );
}
