import React from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "@/components/ui/Sheet";
import {
  TrendingDown,
  TrendingUp,
  Landmark,
  Receipt,
  Target,
  Repeat2,
  HandCoins,
  ShieldCheck,
  ScanLine,
  ChevronRight,
  Plus,
} from "lucide-react";

interface FabMenuProps {
  open: boolean;
  onClose: () => void;
}

const options = [
  {
    to: "/expense-scanner",
    label: "Scan Receipt",
    sub: "Smart expense scanner",
    icon: ScanLine,
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    to: "/add/expense",
    label: "Add Expense",
    sub: "Record money you spent",
    icon: TrendingDown,
    color: "text-coral",
    bg: "bg-coral-soft",
  },
  {
    to: "/add/income",
    label: "Add Income",
    sub: "Record extra income",
    icon: TrendingUp,
    color: "text-mint",
    bg: "bg-mint-soft",
  },
  {
    to: "/add/salary",
    label: "Add Salary",
    sub: "Record your salary credit",
    icon: Landmark,
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    to: "/add/bill",
    label: "Bill / EMI",
    sub: "Add an upcoming payment",
    icon: Receipt,
    color: "text-amber",
    bg: "bg-amber-soft",
  },
  {
    to: "/add/goal",
    label: "Savings Goal",
    sub: "Start a new money goal",
    icon: Target,
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    to: "/recurring",
    label: "Recurring Payment",
    sub: "Subscriptions & repeating bills",
    icon: Repeat2,
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    to: "/lending",
    label: "Lend / Borrow",
    sub: "Track money with people",
    icon: HandCoins,
    color: "text-mint",
    bg: "bg-mint-soft",
  },
  {
    to: "/emergency-fund",
    label: "Emergency Fund",
    sub: "Build your safety buffer",
    icon: ShieldCheck,
    color: "text-amber",
    bg: "bg-amber-soft",
  },
];

export function FabMenu({ open, onClose }: FabMenuProps) {
  const navigate = useNavigate();

  function goTo(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Quick Add">
      <div className="pb-2">
        {/* HERO */}
        <div className="rounded-[24px] bg-primary text-white px-5 py-5 mb-5 relative overflow-hidden">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute right-7 -bottom-12 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-[16px] bg-white/15 flex items-center justify-center shrink-0">
              <Plus size={25} strokeWidth={2.4} />
            </div>

            <div>
              <div className="font-display font-bold text-lg">
                What would you like to add?
              </div>

              <div className="text-xs text-white/70 mt-1">
                Keep your money organised in seconds
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTIONS */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => goTo("/add/expense")}
            className="premium-card-sm p-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="h-11 w-11 rounded-[15px] bg-coral-soft text-coral flex items-center justify-center mb-3">
              <TrendingDown size={20} />
            </div>

            <div className="font-semibold text-sm">
              Expense
            </div>

            <div className="text-[11px] text-ink-faint mt-1">
              Money spent
            </div>
          </button>

          <button
            type="button"
            onClick={() => goTo("/add/income")}
            className="premium-card-sm p-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="h-11 w-11 rounded-[15px] bg-mint-soft text-mint flex items-center justify-center mb-3">
              <TrendingUp size={20} />
            </div>

            <div className="font-semibold text-sm">
              Income
            </div>

            <div className="text-[11px] text-ink-faint mt-1">
              Money received
            </div>
          </button>
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint px-1 mb-2">
          More actions
        </div>

        {/* OTHER ACTIONS */}
        <div className="premium-card overflow-hidden max-h-[46vh] overflow-y-auto">
          {options
            .filter(
              (opt) =>
                opt.to !== "/add/expense" &&
                opt.to !== "/add/income"
            )
            .map((opt, index, arr) => {
              const Icon = opt.icon;

              return (
                <button
                  key={opt.to}
                  type="button"
                  onClick={() => goTo(opt.to)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-black/[0.025] dark:active:bg-white/[0.03] transition-colors ${
                    index !== arr.length - 1
                      ? "border-b border-black/[0.05] dark:border-white/[0.05]"
                      : ""
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0 ${opt.bg} ${opt.color}`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {opt.label}
                    </div>

                    <div className="text-[11px] text-ink-faint mt-0.5 truncate">
                      {opt.sub}
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-ink-faint shrink-0"
                  />
                </button>
              );
            })}
        </div>
      </div>
    </Sheet>
  );
}
