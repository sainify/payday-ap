import { SalaryCycle } from "@/types";

/**
 * PAYDAY calculates all "monthly" numbers on the user's SALARY CYCLE,
 * i.e. the span between one salary date and the next — not the calendar month.
 *
 * Example: salary lands on the 28th -> cycle runs 28 Jul -> 27 Aug -> 28 Aug ...
 * If the 28th doesn't exist in a short month, we clamp to the last day of that month.
 */

function clampDay(year: number, month: number, day: number): Date {
  // month is 0-indexed here
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Returns the most recent salary date on/before `today`, and the next one after it. */
export function getSalaryCycle(salaryCycleDay: number, today: Date = new Date()): SalaryCycle {
  const y = today.getFullYear();
  const m = today.getMonth();

  let cycleStart = clampDay(y, m, salaryCycleDay);
  if (cycleStart > today) {
    // salary date this month hasn't happened yet -> previous month's date started the cycle
    cycleStart = clampDay(y, m - 1, salaryCycleDay);
  }

  let cycleEnd = clampDay(cycleStart.getFullYear(), cycleStart.getMonth() + 1, salaryCycleDay);
  // guard against equal dates for short months
  if (cycleEnd <= cycleStart) {
    cycleEnd = clampDay(cycleStart.getFullYear(), cycleStart.getMonth() + 2, salaryCycleDay);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay);
  const elapsed = Math.floor((startOfDay(today).getTime() - startOfDay(cycleStart).getTime()) / msPerDay);
  const cycleDay = Math.max(1, elapsed + 1);
  const daysRemaining = Math.max(0, totalDays - elapsed);

  return {
    start: toISODate(cycleStart),
    end: toISODate(cycleEnd),
    cycleDay,
    totalDays,
    daysRemaining,
  };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Safe-to-spend-today = remaining discretionary balance / days left in cycle. */
export function calcSafeToSpend(availableBalance: number, upcomingBillsTotal: number, daysRemaining: number): number {
  const safeBucket = Math.max(0, availableBalance - upcomingBillsTotal);
  const days = Math.max(1, daysRemaining);
  return safeBucket / days;
}

/** Naive linear month-end balance prediction based on average daily spend so far this cycle. */
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
