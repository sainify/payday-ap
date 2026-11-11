export interface SalaryCycle {
  start: string;
  end: string;
  cycleDay: number;
  totalDays: number;
  daysRemaining: number;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fixed PAYDAY salary period: 24th through 23rd, inclusive. */
export function getSalaryCycle(_salaryCycleDay: number, today: Date = new Date()): SalaryCycle {
  const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = current.getUTCDate() >= 24
    ? new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 24))
    : new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 24));
  const nextStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 24));
  const end = new Date(Date.UTC(nextStart.getUTCFullYear(), nextStart.getUTCMonth(), 23));
  const msPerDay = 86400000;
  const totalDays = Math.round((nextStart.getTime() - start.getTime()) / msPerDay);
  const elapsed = Math.max(0, Math.floor((current.getTime() - start.getTime()) / msPerDay));
  const cycleDay = Math.min(totalDays, elapsed + 1);
  const daysRemaining = Math.max(0, Math.floor((end.getTime() - current.getTime()) / msPerDay) + 1);
  return { start: toISODate(start), end: toISODate(end), cycleDay, totalDays, daysRemaining };
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
): { predicted: number; avgDailySpend: number } {
  const avgDailySpend = cycleDay > 0 ? spentThisCycle / cycleDay : 0;
  const daysLeft = Math.max(0, totalDays - cycleDay);
  return { predicted: availableBalance - avgDailySpend * daysLeft, avgDailySpend };
}
