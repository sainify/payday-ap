import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { getSalaryCycle, predictCycleEndBalance, toISODate } from "../utils/cycle";

export async function spendingBreakdown(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  const cycle = getSalaryCycle(user?.salary_cycle_day || 1);

  const { results } = await ctx.env.DB.prepare(
    `SELECT COALESCE(c.name, 'Uncategorised') AS category, SUM(t.amount) AS amount
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.txn_date >= ? AND t.txn_date <= ?
     GROUP BY category
     ORDER BY amount DESC`
  )
    .bind(ctx.userId, cycle.start, cycle.end)
    .all();

  return json({ items: results }, {}, ctx.origin);
}

export async function salaryGrowth(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(
    "SELECT salary_date AS date, amount FROM salary_entries WHERE user_id = ? ORDER BY salary_date ASC LIMIT 24"
  )
    .bind(ctx.userId)
    .all();
  return json({ points: results }, {}, ctx.origin);
}

export async function prediction(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);

  const cycle = getSalaryCycle(user.salary_cycle_day);
  const today = toISODate(new Date());

  const [salaryTotal, incomeTotal, expenseTotal, goalContribTotal, spentThisCycle] = await Promise.all([
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM salary_entries WHERE user_id = ?").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'income'").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense'").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM savings_entries WHERE user_id = ?").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND txn_date >= ? AND txn_date <= ?"
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),
  ]);

  const availableBalance =
    (salaryTotal?.total || 0) + (incomeTotal?.total || 0) - (expenseTotal?.total || 0) - (goalContribTotal?.total || 0);

  const { predicted, avgDailySpend } = predictCycleEndBalance(
    availableBalance,
    spentThisCycle?.total || 0,
    cycle.cycleDay,
    cycle.totalDays
  );

  return json({ predictedEndBalance: predicted, avgDailySpend }, {}, ctx.origin);
}

export async function canIAfford(ctx: Ctx): Promise<Response> {
  const { amount } = await ctx.req.json<{ amount: number }>();
  if (!amount || amount <= 0) return errorResponse("Enter a valid amount.", 400, ctx.origin);

  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);

  const cycle = getSalaryCycle(user.salary_cycle_day);
  const today = toISODate(new Date());

  const [salaryTotal, incomeTotal, expenseTotal, goalContribTotal, upcomingBillsRow] = await Promise.all([
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM salary_entries WHERE user_id = ?").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'income'").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense'").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM savings_entries WHERE user_id = ?").bind(ctx.userId).first<{ total: number }>(),
    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM bills WHERE user_id = ? AND status = 'pending' AND due_date >= ? AND due_date <= ?"
    ).bind(ctx.userId, today, cycle.end).first<{ total: number }>(),
  ]);

  const availableBalance =
    (salaryTotal?.total || 0) + (incomeTotal?.total || 0) - (expenseTotal?.total || 0) - (goalContribTotal?.total || 0);
  const safeBucket = Math.max(0, availableBalance - (upcomingBillsRow?.total || 0));
  const remainingSafeToSpend = safeBucket - amount;
  const perDayAfter = remainingSafeToSpend / Math.max(1, cycle.daysRemaining);
  const perDayNow = safeBucket / Math.max(1, cycle.daysRemaining);

  let verdict: "yes" | "caution" | "no" = "yes";
  let message = `You'll comfortably stay on track with ${cycle.daysRemaining} days left in your cycle.`;

  if (remainingSafeToSpend < 0) {
    verdict = "no";
    message = "This would push you past your safe-to-spend buffer for the rest of the cycle.";
  } else if (perDayAfter < perDayNow * 0.5) {
    verdict = "caution";
    message = "This is affordable, but it will noticeably tighten your daily budget for the rest of the cycle.";
  }

  return json(
    { verdict, message, remainingSafeToSpend: Math.max(0, remainingSafeToSpend), daysRemaining: cycle.daysRemaining },
    {},
    ctx.origin
  );
}
