export interface SalaryCycle {
  start: string;
  end: string;
  cycleDay: number;
  totalDays: number;
  daysRemaining: number;
}

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Salary-cycle math, mirroring frontend/src/lib/cycle.ts. Computed in UTC on the server. */
export function getSalaryCycle(salaryCycleDay: number, today: Date = new Date()): SalaryCycle {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  let cycleStart = clampDay(y, m, salaryCycleDay);
  if (cycleStart > today) {
    cycleStart = clampDay(y, m - 1, salaryCycleDay);
  }

  let cycleEnd = clampDay(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth() + 1, salaryCycleDay);
  if (cycleEnd <= cycleStart) {
    cycleEnd = clampDay(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth() + 2, salaryCycleDay);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay);
  const elapsed = Math.floor((startOfDayUTC(today).getTime() - cycleStart.getTime()) / msPerDay);
  const cycleDay = Math.max(1, elapsed + 1);
  const daysRemaining = Math.max(0, totalDays - elapsed);

  return { start: toISODate(cycleStart), end: toISODate(cycleEnd), cycleDay, totalDays, daysRemaining };
}

export function calcSafeToSpend(availableBalance: number, upcomingBillsTotal: number, daysRemaining: number): number {
  const safeBucket = Math.max(0, availableBalance - upcomingBillsTotal);
  const days = Math.max(1, daysRemaining);
  return safeBucket / days;
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
