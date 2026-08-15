import { SalaryCycle } from "@/types";

/**
 * PAYDAY calculates all "monthly" numbers on the user's SALARY CYCLE,
 * i.e. the span between one salary date and the next — not the calendar month.
 */

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

export function getSalaryCycle(
  salaryCycleDay: number,
  today: Date = new Date()
): SalaryCycle {
  const y = today.getFullYear();
  const m = today.getMonth();

  let cycleStart = clampDay(y, m, salaryCycleDay);

  if (cycleStart > today) {
    cycleStart = clampDay(y, m - 1, salaryCycleDay);
  }

  let cycleEnd = clampDay(
    cycleStart.getFullYear(),
    cycleStart.getMonth() + 1,
    salaryCycleDay
  );

  if (cycleEnd <= cycleStart) {
    cycleEnd = clampDay(
      cycleStart.getFullYear(),
      cycleStart.getMonth() + 2,
      salaryCycleDay
    );
  }

  const msPerDay = 1000 * 60 * 60 * 24;

  const totalDays = Math.round(
    (cycleEnd.getTime() - cycleStart.getTime()) / msPerDay
  );

  const elapsed = Math.floor(
    (startOfDay(today).getTime() - startOfDay(cycleStart).getTime()) /
      msPerDay
  );

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

export function calcSafeToSpend(
  availableBalance: number,
  upcomingBillsTotal: number,
  daysRemaining: number
): number {
  const safeBucket = Math.max(
    0,
    availableBalance - upcomingBillsTotal
  );

  const days = Math.max(1, daysRemaining);

  return safeBucket / days;
}

export function predictCycleEndBalance(
  availableBalance: number,
  spentThisCycle: number,
  cycleDay: number,
  totalDays: number
): number {
  const avgDailySpend =
    cycleDay > 0 ? spentThisCycle / cycleDay : 0;

  const daysLeft = Math.max(
    0,
    totalDays - cycleDay
  );

  return availableBalance - avgDailySpend * daysLeft;
}
