import { SalaryCycle } from "@/types";

/** Fixed PAYDAY salary period: 24th through 23rd, inclusive. */
export function getSalaryCycle(_salaryCycleDay: number, today: Date = new Date()): SalaryCycle {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = current.getDate() >= 24
    ? new Date(current.getFullYear(), current.getMonth(), 24)
    : new Date(current.getFullYear(), current.getMonth() - 1, 24);
  const nextStart = new Date(start.getFullYear(), start.getMonth() + 1, 24);
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), 23);
  const msPerDay = 86400000;
  const totalDays = Math.round((nextStart.getTime() - start.getTime()) / msPerDay);
  const elapsed = Math.max(0, Math.floor((current.getTime() - start.getTime()) / msPerDay));
  const cycleDay = Math.min(totalDays, elapsed + 1);
  const daysRemaining = Math.max(0, Math.floor((end.getTime() - current.getTime()) / msPerDay) + 1);
  return { start: toISODate(start), end: toISODate(end), cycleDay, totalDays, daysRemaining };
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcSafeToSpend(availableBalance: number, upcomingBillsTotal: number, daysRemaining: number): number {
  const safeBucket = Math.max(0, availableBalance - upcomingBillsTotal);
  return safeBucket / Math.max(1, daysRemaining);
}

export function predictCycleEndBalance(
  availableBalance: number,
  spentThisCycle: number,
  cycleDay: number,
  totalDays: number
): number {
  const avgDailySpend = cycleDay > 0 ? spentThisCycle / cycleDay : 0;
  const daysLeft = Math.max(0, totalDays - cycleDay);
  return availableBalance - avgDailySpend * daysLeft;
}
