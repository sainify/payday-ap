import React from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingDown,
  PiggyBank,
  Receipt,
  ChevronRight,
  AlertCircle,
  Check,
} from "lucide-react";
import { ClayCard } from "@/components/ui/ClayCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Amount } from "@/components/ui/Amount";
import { TopBar } from "@/components/layout/TopBar";
import { useApp } from "@/context/AppContext";
import { useDashboard, mutate } from "@/hooks/useData";
import { formatINR } from "@/lib/currency";

export default function Home() {
  const { user } = useApp();
  const { data, loading, reload } = useDashboard();

  const firstName = user?.name?.split(" ")[0] || "there";
  const cycle = data?.cycle;
  const progress = cycle
    ? cycle.cycleDay / Math.max(1, cycle.totalDays)
    : 0;

  async function markPaid(id: string) {
    await mutate(`/bills/${id}/pay`, "PATCH");
    reload();
  }

  return (
    <div className="pb-28">
      <TopBar
        title={`Hi, ${firstName}`}
        subtitle="Here's where things stand"
        showPrivacyToggle
      />

      <div className="px-5 space-y-4">
        <ClayCard className="flex items-center gap-5">
          <ProgressRing progress={progress} size={112} strokeWidth={10}>
            <div className="text-center">
              <div className="text-2xl font-display font-bold tabular">
                {cycle?.daysRemaining ?? "–"}
              </div>
              <div className="text-[10px] text-ink-faint uppercase tracking-wide">
                days left
              </div>
            </div>
          </ProgressRing>

          <div className="flex-1 min-w-0">
            <div className="text-sm text-ink-faint mb-1">
              Available Balance
            </div>

            <Amount value={data?.availableBalance ?? 0} size="xl" />

            <div className="text-sm text-ink-faint mt-2">
              Next salary in{" "}
              <span className="text-ink dark:text-ink-inverted font-semibold">
                {cycle?.daysRemaining ?? "–"} day
                {cycle?.daysRemaining === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </ClayCard>

        <ClayCard className="bg-primary text-white !shadow-clay-raised">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80 text-sm mb-1">
                Safe to Spend Today
              </div>

              <div className="text-3xl font-display font-bold tabular">
                {formatINR(data?.safeToSpendToday ?? 0)}
              </div>
            </div>

            <Wallet size={36} className="text-white/70" />
          </div>
        </ClayCard>

        <div className="grid grid-cols-2 gap-4">
          <ClayCard padded className="!p-4">
            <div className="flex items-center gap-2 text-coral mb-2">
              <TrendingDown size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Spent
              </span>
            </div>

            <Amount value={data?.spentThisCycle ?? 0} size="lg" />

            <div className="text-xs text-ink-faint mt-1">
              this salary cycle
            </div>
          </ClayCard>

          <ClayCard padded className="!p-4">
            <div className="flex items-center gap-2 text-mint mb-2">
              <PiggyBank size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Saved
              </span>
            </div>

            <Amount value={data?.savedThisCycle ?? 0} size="lg" />

            <div className="text-xs text-ink-faint mt-1">
              this salary cycle
            </div>
          </ClayCard>
        </div>

        <ClayCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Receipt size={18} />
              Upcoming Bills
            </h3>

            <Link
              to="/transactions"
              className="text-primary text-sm font-semibold flex items-center"
            >
              See all
              <ChevronRight size={16} />
            </Link>
          </div>

          {loading && (
            <p className="text-sm text-ink-faint">
              Loading…
            </p>
          )}

          {!loading && (data?.upcomingBills?.length ?? 0) === 0 && (
            <p className="text-sm text-ink-faint">
              No bills due soon. Nice and clear.
            </p>
          )}

          <div className="space-y-2">
            {data?.upcomingBills?.slice(0, 4).map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between clay-inset px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-clay-sm bg-amber-soft text-amber flex items-center justify-center">
                    <AlertCircle size={16} />
                  </div>

                  <div>
                    <div className="font-medium text-sm">
                      {bill.title}
                    </div>

                    <div className="text-xs text-ink-faint">
                      Due{" "}
                      {new Date(bill.due_date).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Amount value={bill.amount} size="sm" />

                  <button
                    onClick={() => markPaid(bill.id)}
                    aria-label="Mark as paid"
                    className="h-8 w-8 rounded-full clay-inset flex items-center justify-center text-mint"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ClayCard>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/afford"
            className="clay-surface-sm clay-pressable p-4 block"
          >
            <div className="font-semibold text-sm">
              Can I Afford It?
            </div>
            <div className="text-xs text-ink-faint mt-1">
              Check before you buy
            </div>
          </Link>

          <Link
            to="/splitter"
            className="clay-surface-sm clay-pressable p-4 block"
          >
            <div className="font-semibold text-sm">
              Salary Splitter
            </div>
            <div className="text-xs text-ink-faint mt-1">
              Needs · Savings · More
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
