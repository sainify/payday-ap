import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayInput } from "@/components/ui/ClayInput";
import { ClayButton } from "@/components/ui/ClayButton";
import { formatINR } from "@/lib/currency";
import { api } from "@/lib/api";

interface AffordResult {
  verdict: "yes" | "caution" | "no";
  message: string;
  remainingSafeToSpend: number;
  daysRemaining: number;
}

export default function CanIAffordIt() {
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<AffordResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<AffordResult>("/insights/can-i-afford", { amount: Number(amount) });
      setResult(res);
    } finally {
      setBusy(false);
    }
  }

  const verdictStyle = {
    yes: { icon: CheckCircle2, color: "text-mint", bg: "bg-mint-soft" },
    caution: { icon: AlertTriangle, color: "text-amber", bg: "bg-amber-soft" },
    no: { icon: XCircle, color: "text-coral", bg: "bg-coral-soft" },
  } as const;

  return (
    <div className="pb-28">
      <TopBar title="Can I Afford It?" subtitle="Check before you spend" back />
      <div className="px-5 space-y-4">
        <ClayCard>
          <form onSubmit={check}>
            <ClayInput
              label="What does it cost? (₹)"
              type="number"
              inputMode="decimal"
              min={0}
              autoFocus
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <ClayButton type="submit" fullWidth disabled={busy}>
              {busy ? "Checking…" : "Check"}
            </ClayButton>
          </form>
        </ClayCard>

        {result && (
          <ClayCard className="text-center">
            {(() => {
              const V = verdictStyle[result.verdict];
              return (
                <div className={`mx-auto mb-3 h-16 w-16 rounded-full ${V.bg} ${V.color} flex items-center justify-center`}>
                  <V.icon size={32} />
                </div>
              );
            })()}
            <p className="font-display font-semibold text-lg mb-1">
              {result.verdict === "yes" ? "Go for it" : result.verdict === "caution" ? "Proceed with caution" : "Better to wait"}
            </p>
            <p className="text-sm text-ink-faint mb-4">{result.message}</p>
            <div className="clay-inset px-4 py-3 flex items-center justify-between text-sm">
              <span>Safe-to-spend left, over {result.daysRemaining} days</span>
              <span className="font-semibold tabular">{formatINR(result.remainingSafeToSpend)}</span>
            </div>
          </ClayCard>
        )}
      </div>
    </div>
  );
}
