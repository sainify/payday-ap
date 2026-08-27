import React from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Receipt,
  ChevronRight,
  AlertCircle,
  Check,
  Sparkles,
  Gauge,
  Repeat2,
  ShieldCheck,
  Landmark,
  Bell,
  Target,
  ScanLine,
  Archive,
  ArrowUpRight,
} from "lucide-react";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { Amount } from "@/components/ui/Amount";
import { TopBar } from "@/components/layout/TopBar";
import { useApp } from "@/context/AppContext";
import { useDashboard, mutate } from "@/hooks/useData";
import { formatINR } from "@/lib/currency";
import clsx from "clsx";

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
    <div className="pb-44">
      <TopBar
        title={`Hi, ${firstName}`}
        subtitle="Here's where things stand"
        showPrivacyToggle
      />

      <div className="px-5 space-y-6">
        {/* AVAILABLE BALANCE */}
        <section className="premium-card p-5">
          <div className="flex items-center gap-5">
            <ProgressRing
              progress={progress}
              size={105}
              strokeWidth={9}
            >
              <div className="text-center">
                <div className="text-[28px] leading-none font-display font-bold tabular">
                  {cycle?.daysRemaining ?? "–"}
                </div>

                <div className="mt-2 text-[9px] text-ink-faint uppercase tracking-[0.12em]">
                  days left
                </div>
              </div>
            </ProgressRing>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-ink-faint mb-1">
                Available Balance
              </div>

              <Amount
                value={data?.availableBalance ?? 0}
                size="xl"
              />

              <div className="text-xs text-ink-faint mt-2">
                Next salary in{" "}
                <span className="text-ink dark:text-ink-inverted font-semibold">
                  {cycle?.daysRemaining ?? "–"}{" "}
                  day{cycle?.daysRemaining === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SAFE TO SPEND */}
        <section className="relative overflow-hidden rounded-[30px] bg-primary text-white p-6 shadow-[0_18px_40px_rgba(79,70,229,0.20)]">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between">
            <div>
              <div className="text-sm text-white/75">
                Safe to Spend Today
              </div>

              <div className="mt-2 text-[34px] leading-none font-display font-bold tabular">
                {formatINR(data?.safeToSpendToday ?? 0)}
              </div>
            </div>

            <div className="h-12 w-12 rounded-[17px] bg-white/10 flex items-center justify-center">
              <Wallet size={25} className="text-white/80" />
            </div>
          </div>

          {data?.forecast && (
            <div className="relative mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs">
              <span className="text-white/70">
                At this pace, cycle-end
              </span>

              <span className="font-semibold text-white">
                {data.forecast.rawPredictedEndBalance < 0
                  ? `-${formatINR(
                      Math.abs(
                        data.forecast.rawPredictedEndBalance
                      )
                    )}`
                  : formatINR(
                      data.forecast.predictedEndBalance
                    )}
              </span>
            </div>
          )}
        </section>

        {/* SMART MONEY ALERT */}
        {(data?.smartAlerts?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={18}
                  className="text-primary"
                />

                <h2 className="font-display font-semibold text-[18px]">
                  Smart Money Alert
                </h2>
              </div>

              <Link
                to="/reminders"
                className="text-primary text-xs font-semibold"
              >
                Reminders
              </Link>
            </div>

            <div className="space-y-3">
              {data?.smartAlerts
                ?.slice(0, 2)
                .map((a, i) => (
                  <div
                    key={`${a.type}-${i}`}
                    className="premium-card-sm p-4 flex gap-3"
                  >
                    <div
                      className={clsx(
                        "h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0",
                        a.severity === "danger"
                          ? "bg-coral-soft text-coral"
                          : a.severity === "warning"
                            ? "bg-amber-soft text-amber"
                            : "bg-primary-soft text-primary"
                      )}
                    >
                      <AlertCircle size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm">
                        {a.title}
                      </div>

                      <div className="text-xs text-ink-faint mt-1 leading-relaxed">
                        {a.message}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* SPENT / SAVED */}
        <section className="grid grid-cols-2 gap-3">
          <div className="premium-card p-4">
            <div className="flex items-center gap-2 text-coral">
              <TrendingDown size={17} />

              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Spent
              </span>
            </div>

            <div className="mt-4">
              <Amount
                value={data?.spentThisCycle ?? 0}
                size="lg"
              />
            </div>

            <div className="text-[11px] text-ink-faint mt-1">
              this salary cycle
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-2 text-mint">
              <PiggyBank size={17} />

              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Saved
              </span>
            </div>

            <div className="mt-4">
              <Amount
                value={data?.savedThisCycle ?? 0}
                size="lg"
              />
            </div>

            <div className="text-[11px] text-ink-faint mt-1">
              this salary cycle
            </div>
          </div>
        </section>

        {/* UPCOMING BILLS */}
        <section>
          <SectionHeader
            icon={<Receipt size={18} />}
            title="Upcoming Bills"
            link="/transactions"
            linkText="See all"
          />

          <div className="premium-card p-3">
            {loading && (
              <p className="text-sm text-ink-faint p-3">
                Loading…
              </p>
            )}

            {!loading &&
              (data?.upcomingBills?.length ?? 0) === 0 && (
                <div className="text-center py-8">
                  <div className="mx-auto h-11 w-11 rounded-full bg-mint-soft text-mint flex items-center justify-center mb-3">
                    <Check size={19} />
                  </div>

                  <p className="text-sm font-medium">
                    Nothing due soon
                  </p>

                  <p className="text-xs text-ink-faint mt-1">
                    You're all clear.
                  </p>
                </div>
              )}

            <div>
              {data?.upcomingBills
                ?.slice(0, 4)
                .map((bill, index) => (
                  <div
                    key={bill.id}
                    className={clsx(
                      "flex items-center justify-between py-3 px-2",
                      index !== 0 &&
                        "border-t border-black/[0.05] dark:border-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-[14px] bg-amber-soft text-amber flex items-center justify-center shrink-0">
                        <Receipt size={17} />
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {bill.title}
                        </div>

                        <div className="text-[11px] text-ink-faint mt-0.5">
                          Due{" "}
                          {new Date(
                            `${bill.due_date}T00:00:00`
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Amount
                        value={bill.amount}
                        size="sm"
                      />

                      <button
                        onClick={() =>
                          markPaid(bill.id)
                        }
                        aria-label="Mark as paid"
                        className="h-8 w-8 rounded-full bg-mint-soft text-mint flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section>
          <SectionHeader
            icon={<TrendingUp size={18} />}
            title="Recent Transactions"
            link="/transactions"
            linkText="View all"
          />

          <div className="premium-card p-3">
            {(data?.recentTransactions?.length ?? 0) ===
            0 ? (
              <div className="text-center py-8">
                <Receipt
                  size={25}
                  className="mx-auto text-ink-faint mb-3"
                />

                <p className="text-sm font-medium">
                  No transactions yet
                </p>

                <p className="text-xs text-ink-faint mt-1">
                  Your latest activity will appear here.
                </p>
              </div>
            ) : (
              <div>
                {data?.recentTransactions
                  ?.slice(0, 4)
                  .map((t, index) => (
                    <div
                      key={t.id}
                      className={clsx(
                        "flex items-center justify-between px-2 py-3",
                        index !== 0 &&
                          "border-t border-black/[0.05] dark:border-white/[0.05]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={clsx(
                            "h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0",
                            t.type === "expense"
                              ? "bg-coral-soft text-coral"
                              : "bg-mint-soft text-mint"
                          )}
                        >
                          {t.type === "expense" ? (
                            <TrendingDown size={17} />
                          ) : (
                            <TrendingUp size={17} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {t.note ||
                              t.category_name ||
                              "Transaction"}
                          </div>

                          <div className="text-[11px] text-ink-faint mt-0.5">
                            {new Date(
                              `${t.txn_date}T00:00:00`
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>
                      </div>

                      <Amount
                        value={
                          t.type === "expense"
                            ? -t.amount
                            : t.amount
                        }
                        sign
                        size="sm"
                        className={
                          t.type === "expense"
                            ? "text-coral"
                            : "text-mint"
                        }
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* SCANNER */}
        <section className="premium-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[17px] bg-primary text-white flex items-center justify-center shrink-0">
              <ScanLine size={21} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">
                Smart Expense Scanner
              </div>

              <div className="text-[11px] text-ink-faint mt-1">
                Scan receipts and update expenses
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/receipts"
                aria-label="Receipt vault"
                className="h-9 w-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center"
              >
                <Archive size={16} />
              </Link>

              <Link
                to="/expense-scanner"
                className="h-9 px-4 rounded-full bg-primary text-white text-xs font-semibold flex items-center"
              >
                Scan
              </Link>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="section-label px-1 mb-3">
            Quick actions
          </div>

          <div className="grid grid-cols-2 gap-3">
            <QuickCard
              to="/afford"
              title="Can I Afford It?"
              sub="Check before you buy"
            />

            <QuickCard
              to="/splitter"
              title="Salary Splitter"
              sub="Plan your salary"
            />
          </div>
        </section>

        {/* MONEY TOOLS */}
        <section>
          <div className="section-label px-1 mb-3">
            Money Tools
          </div>

          <div className="premium-card overflow-hidden">
            <ToolRow
              to="/budgets"
              icon={<Gauge size={18} />}
              title="Budgets"
              sub="Category limits"
            />

            <ToolRow
              to="/recurring"
              icon={<Repeat2 size={18} />}
              title="Recurring"
              sub="Subscriptions & payments"
            />

            <ToolRow
              to="/emergency-fund"
              icon={<ShieldCheck size={18} />}
              title="Emergency Fund"
              sub="Build your buffer"
            />

            <ToolRow
              to="/debts"
              icon={<Landmark size={18} />}
              title="Debt & EMI"
              sub="Track repayments"
            />

            <ToolRow
              to="/goals"
              icon={<Target size={18} />}
              title="Goals"
              sub="Save with purpose"
            />

            <ToolRow
              to="/reminders"
              icon={<Bell size={18} />}
              title="Reminders"
              sub="Bills and upcoming payments"
              last
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  link,
  linkText,
}: {
  icon: React.ReactNode;
  title: string;
  link: string;
  linkText: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <span className="text-primary">
          {icon}
        </span>

        <h2 className="font-display font-semibold text-[17px]">
          {title}
        </h2>
      </div>

      <Link
        to={link}
        className="flex items-center text-primary text-xs font-semibold"
      >
        {linkText}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function QuickCard({
  to,
  title,
  sub,
}: {
  to: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="premium-card-sm premium-pressable p-4 block"
    >
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-[13px] bg-primary-soft text-primary flex items-center justify-center">
          <Sparkles size={17} />
        </div>

        <ArrowUpRight
          size={16}
          className="text-ink-faint"
        />
      </div>

      <div className="font-semibold text-sm mt-4">
        {title}
      </div>

      <div className="text-[11px] text-ink-faint mt-1">
        {sub}
      </div>
    </Link>
  );
}

function ToolRow({
  to,
  icon,
  title,
  sub,
  last = false,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        "flex items-center gap-3 px-4 py-4 active:bg-black/[0.025] dark:active:bg-white/[0.03] transition-colors",
        !last &&
          "border-b border-black/[0.05] dark:border-white/[0.05]"
      )}
    >
      <div className="h-10 w-10 rounded-[14px] bg-primary-soft text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">
          {title}
        </div>

        <div className="text-[11px] text-ink-faint mt-0.5">
          {sub}
        </div>
      </div>

      <ChevronRight
        size={17}
        className="text-ink-faint"
      />
    </Link>
  );
}
