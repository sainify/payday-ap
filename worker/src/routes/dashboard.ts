import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { getSalaryCycle, calcSafeToSpend, toISODate } from "../utils/cycle";

export async function getDashboard(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);

  const cycle = getSalaryCycle(user.salary_cycle_day);
  const today = toISODate(new Date());

  const [salaryTotal, incomeTotal, expenseTotal, goalContribTotal, latestSalary] = await Promise.all([
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM salary_entries WHERE user_id = ?")
      .bind(ctx.userId)
      .first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'income'")
      .bind(ctx.userId)
      .first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense'")
      .bind(ctx.userId)
      .first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM savings_entries WHERE user_id = ?")
      .bind(ctx.userId)
      .first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT amount FROM salary_entries WHERE user_id = ? ORDER BY salary_date DESC LIMIT 1")
      .bind(ctx.userId)
      .first<{ amount: number }>(),
  ]);

  const availableBalance =
    (salaryTotal?.total || 0) + (incomeTotal?.total || 0) - (expenseTotal?.total || 0) - (goalContribTotal?.total || 0);

  const spentThisCycleRow = await ctx.env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND txn_date >= ? AND txn_date <= ?"
  )
    .bind(ctx.userId, cycle.start, today)
    .first<{ total: number }>();

  const savedThisCycleRow = await ctx.env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM savings_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?"
  )
    .bind(ctx.userId, cycle.start, today)
    .first<{ total: number }>();

  const { results: upcomingBills } = await ctx.env.DB.prepare(
    "SELECT * FROM bills WHERE user_id = ? AND status = 'pending' AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC"
  )
    .bind(ctx.userId, today, cycle.end)
    .all();

  const upcomingBillsTotal = (upcomingBills as { amount: number }[]).reduce((s, b) => s + b.amount, 0);
  const safeToSpendToday = calcSafeToSpend(availableBalance, upcomingBillsTotal, cycle.daysRemaining);

  return json(
    {
      availableBalance,
      safeToSpendToday,
      spentThisCycle: spentThisCycleRow?.total || 0,
      savedThisCycle: savedThisCycleRow?.total || 0,
      upcomingBills,
      cycle,
      currentSalary: latestSalary?.amount || 0,
    },
    {},
    ctx.origin
  );
}
