import React from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "@/components/ui/Sheet";
import { TrendingDown, TrendingUp, Landmark, Receipt, Target, Repeat2, HandCoins, ShieldCheck } from "lucide-react";

interface FabMenuProps { open: boolean; onClose: () => void; }

const options = [
  { to: "/add/expense", label: "Expense", sub: "Log something you spent", icon: TrendingDown, color: "text-coral bg-coral-soft" },
  { to: "/add/income", label: "Income", sub: "Extra income this cycle", icon: TrendingUp, color: "text-mint bg-mint-soft" },
  { to: "/add/salary", label: "Salary", sub: "Record your salary credit", icon: Landmark, color: "text-primary bg-primary-soft" },
  { to: "/add/bill", label: "Bill / EMI", sub: "Add an upcoming bill", icon: Receipt, color: "text-amber bg-amber-soft" },
  { to: "/add/goal", label: "Goal", sub: "Start a new savings goal", icon: Target, color: "text-primary bg-primary-soft" },
  { to: "/recurring", label: "Recurring / Subscription", sub: "Track repeating payments", icon: Repeat2, color: "text-primary bg-primary-soft" },
  { to: "/lending", label: "Lend / Borrow", sub: "Track money with people", icon: HandCoins, color: "text-mint bg-mint-soft" },
  { to: "/emergency-fund", label: "Emergency Fund", sub: "Build your safety buffer", icon: ShieldCheck, color: "text-amber bg-amber-soft" },
];

export function FabMenu({ open, onClose }: FabMenuProps) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onClose={onClose} title="Quick Add">
      <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
        {options.map((opt) => (
          <button key={opt.to} onClick={() => { onClose(); navigate(opt.to); }} className="w-full clay-surface-sm clay-pressable flex items-center gap-4 p-4 text-left">
            <div className={`h-12 w-12 rounded-clay-sm flex items-center justify-center ${opt.color}`}><opt.icon size={22} /></div>
            <div><div className="font-semibold">{opt.label}</div><div className="text-sm text-ink-faint">{opt.sub}</div></div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
