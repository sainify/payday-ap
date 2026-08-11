import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Check } from "lucide-react";
import clsx from "clsx";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { ClayButton } from "@/components/ui/ClayButton";
import { Amount } from "@/components/ui/Amount";
import { Sheet } from "@/components/ui/Sheet";
import { useLending, mutate } from "@/hooks/useData";
import { LendingType } from "@/types";

export default function LendBorrow() {
  const { data, loading, reload } = useLending();
  const [sheetOpen, setSheetOpen] = useState(false);

  const open = data?.filter((d) => d.status === "open") || [];
  const totalLent = open.filter((d) => d.type === "lent").reduce((s, d) => s + (d.amount - d.settled_amount), 0);
  const totalBorrowed = open.filter((d) => d.type === "borrowed").reduce((s, d) => s + (d.amount - d.settled_amount), 0);

  async function settle(id: string) {
    await mutate(`/lending/${id}/settle`, "PATCH");
    reload();
  }

  return (
    <div className="pb-28">
      <TopBar title="Lent & Borrowed" subtitle="Keep track, settle up" back />
      <div className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <ClayCard className="!p-4">
            <div className="flex items-center gap-2 text-mint mb-2 text-xs font-semibold uppercase">
              <ArrowUpRight size={16} /> You're owed
            </div>
            <Amount value={totalLent} size="lg" />
          </ClayCard>
          <ClayCard className="!p-4">
            <div className="flex items-center gap-2 text-coral mb-2 text-xs font-semibold uppercase">
              <ArrowDownLeft size={16} /> You owe
            </div>
            <Amount value={totalBorrowed} size="lg" />
          </ClayCard>
        </div>

        <ClayButton fullWidth onClick={() => setSheetOpen(true)}>
          Add Lent / Borrowed Entry
        </ClayButton>

        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && open.length === 0 && (
          <ClayCard>
            <p className="text-sm text-ink-faint text-center py-4">Nothing outstanding. All settled up.</p>
          </ClayCard>
        )}

        <div className="space-y-3">
          {open.map((entry) => (
            <ClayCard key={entry.id} className="!p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={clsx(
                    "h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0",
                    entry.type === "lent" ? "bg-mint-soft text-mint" : "bg-coral-soft text-coral"
                  )}
                >
                  {entry.type === "lent" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{entry.person_name}</div>
                  <div className="text-xs text-ink-faint">
                    {entry.type === "lent" ? "owes you" : "you owe"}
                    {entry.due_date ? ` · due ${new Date(entry.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Amount value={entry.amount - entry.settled_amount} size="sm" />
                <button
                  onClick={() => settle(entry.id)}
                  aria-label="Mark settled"
                  className="h-8 w-8 rounded-full clay-inset flex items-center justify-center text-mint"
                >
                  <Check size={15} />
                </button>
              </div>
            </ClayCard>
          ))}
        </div>
      </div>

      <AddLendingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={reload} />
    </div>
  );
}

function AddLendingSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<LendingType>("lent");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate("/lending", "POST", {
        type,
        person_name: personName,
        amount: Number(amount),
        due_date: dueDate || null,
      });
      setPersonName("");
      setAmount("");
      setDueDate("");
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add Entry">
      <form onSubmit={submit}>
        <ClaySelect label="Type" value={type} onChange={(e) => setType(e.target.value as LendingType)}>
          <option value="lent">I lent money</option>
          <option value="borrowed">I borrowed money</option>
        </ClaySelect>
        <ClayInput label="Person's name" required value={personName} onChange={(e) => setPersonName(e.target.value)} />
        <ClayInput
          label="Amount (₹)"
          type="number"
          min={0}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <ClayInput label="Due date (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <ClayButton type="submit" fullWidth disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </ClayButton>
      </form>
    </Sheet>
  );
}
