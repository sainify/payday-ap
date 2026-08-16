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

export async function overview(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);

  const cycle = getSalaryCycle(user.salary_cycle_day);
  const prevAnchor = new Date(`${cycle.start}T00:00:00Z`);
  prevAnchor.setUTCDate(prevAnchor.getUTCDate() - 1);
  const previous = getSalaryCycle(user.salary_cycle_day, prevAnchor);

  const [currentExpense, previousExpense, currentTxnIncome, currentSalary, currentSavings, topCategory, budgets, subscriptions] = await Promise.all([
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE user_id = ? AND type = 'expense' AND txn_date >= ? AND txn_date <= ?")
      .bind(ctx.userId, cycle.start, cycle.end).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE user_id = ? AND type = 'expense' AND txn_date >= ? AND txn_date <= ?")
      .bind(ctx.userId, previous.start, previous.end).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE user_id = ? AND type = 'income' AND txn_date >= ? AND txn_date <= ?")
      .bind(ctx.userId, cycle.start, cycle.end).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM salary_entries WHERE user_id = ? AND salary_date >= ? AND salary_date <= ?")
      .bind(ctx.userId, cycle.start, cycle.end).first<{ total: number }>(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM savings_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?")
      .bind(ctx.userId, cycle.start, cycle.end).first<{ total: number }>(),
    ctx.env.DB.prepare(
      `SELECT COALESCE(c.name,'Uncategorised') category, COALESCE(SUM(t.amount),0) amount
       FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.txn_date >= ? AND t.txn_date <= ?
       GROUP BY category ORDER BY amount DESC LIMIT 1`
    ).bind(ctx.userId, cycle.start, cycle.end).first<{ category: string; amount: number }>(),
    ctx.env.DB.prepare(
      `SELECT b.limit_amount, COALESCE(SUM(t.amount),0) spent
       FROM budgets b LEFT JOIN transactions t ON t.user_id=b.user_id AND t.category_id=b.category_id AND t.type='expense' AND t.txn_date >= ? AND t.txn_date <= ?
       WHERE b.user_id=? GROUP BY b.id, b.limit_amount`
    ).bind(cycle.start, cycle.end, ctx.userId).all(),
    ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM recurring_expenses WHERE user_id = ? AND active = 1 AND is_subscription = 1")
      .bind(ctx.userId).first<{ total: number }>(),
  ]);

  const currentSpend = currentExpense?.total || 0;
  const previousSpend = previousExpense?.total || 0;
  const currentIncome = (currentTxnIncome?.total || 0) + (currentSalary?.total || 0);
  const savings = currentSavings?.total || 0;
  const spendChangePct = previousSpend > 0 ? ((currentSpend - previousSpend) / previousSpend) * 100 : null;
  const savingsRate = currentIncome > 0 ? (savings / currentIncome) * 100 : 0;
  const budgetRows = budgets.results as Array<{ limit_amount: number; spent: number }>;
  const budgetsOnTrack = budgetRows.filter((b) => Number(b.spent) <= Number(b.limit_amount)).length;

  return json({
    cycle,
    currentSpend,
    previousSpend,
    spendChangePct,
    currentIncome,
    savings,
    savingsRate,
    topCategory: topCategory || null,
    budgetsOnTrack,
    budgetsTotal: budgetRows.length,
    subscriptionRunRate: subscriptions?.total || 0,
    averageDailySpend: currentSpend / Math.max(1, cycle.cycleDay),
  }, {}, ctx.origin);
}
