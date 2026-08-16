import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { getSalaryCycle, calcSafeToSpend, predictCycleEndBalance, toISODate } from "../utils/cycle";

export async function getDashboard(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);

  const cycle = getSalaryCycle(user.salary_cycle_day);
  const today = toISODate(new Date());

  const [salaryTotal, incomeTotal, expenseTotal, goalContribTotal, latestSalary, spentThisCycleRow, savedThisCycleRow] = await Promise.all([
    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM salary_entries WHERE user_id = ? AND salary_date >= ? AND salary_date <= ?"
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),

    ctx.env.DB.prepare(
      `SELECT COALESCE(SUM(t.amount),0) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ?
         AND t.type = 'income'
         AND t.txn_date >= ?
         AND t.txn_date <= ?
         AND NOT (
           LOWER(COALESCE(c.name,'')) = 'salary'
           AND EXISTS (
             SELECT 1 FROM salary_entries s
             WHERE s.user_id = t.user_id
               AND s.salary_date = t.txn_date
               AND ABS(s.amount - t.amount) < 0.01
           )
         )`
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),

    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND txn_date >= ? AND txn_date <= ?"
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),

    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM savings_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?"
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),

    ctx.env.DB.prepare(
      "SELECT amount FROM salary_entries WHERE user_id = ? ORDER BY salary_date DESC LIMIT 1"
    ).bind(ctx.userId).first<{ amount: number }>(),

    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND txn_date >= ? AND txn_date <= ?"
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),

    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM savings_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?"
    ).bind(ctx.userId, cycle.start, today).first<{ total: number }>(),
  ]);

  const availableBalance =
    (salaryTotal?.total || 0) +
    (incomeTotal?.total || 0) -
    (expenseTotal?.total || 0) -
    (goalContribTotal?.total || 0);

  const [{ results: upcomingBills }, { results: recentTransactions }, { results: budgetRows }, recurringDue, debtsDue] = await Promise.all([
    ctx.env.DB.prepare(
      "SELECT * FROM bills WHERE user_id = ? AND status = 'pending' AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC"
    ).bind(ctx.userId, today, cycle.end).all(),

    ctx.env.DB.prepare(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon
       FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? ORDER BY t.txn_date DESC, t.created_at DESC LIMIT 5`
    ).bind(ctx.userId).all(),

    ctx.env.DB.prepare(
      `SELECT b.id, b.limit_amount, c.name AS category_name,
              COALESCE(SUM(t.amount),0) AS spent
       FROM budgets b JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id AND t.type = 'expense'
         AND t.txn_date >= ? AND t.txn_date <= ?
       WHERE b.user_id = ? GROUP BY b.id, b.limit_amount, c.name`
    ).bind(cycle.start, cycle.end, ctx.userId).all(),

    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM recurring_expenses WHERE user_id = ? AND active = 1 AND next_due_date >= ? AND next_due_date <= ?"
    ).bind(ctx.userId, today, cycle.end).first<{ total: number }>(),

    ctx.env.DB.prepare(
      "SELECT COALESCE(SUM(emi_amount),0) AS total FROM debts WHERE user_id = ? AND status = 'active' AND next_due_date >= ? AND next_due_date <= ?"
    ).bind(ctx.userId, today, cycle.end).first<{ total: number }>(),
  ]);

  const upcomingBillsTotal = (upcomingBills as { amount: number }[]).reduce((s, b) => s + Number(b.amount), 0);
  const safeToSpendToday = calcSafeToSpend(availableBalance, upcomingBillsTotal, cycle.daysRemaining);
  const spentThisCycle = spentThisCycleRow?.total || 0;
  const { predicted, avgDailySpend } = predictCycleEndBalance(
    availableBalance,
    spentThisCycle,
    cycle.cycleDay,
    cycle.totalDays
  );

  const knownFutureCommitments =
    upcomingBillsTotal + (recurringDue?.total || 0) + (debtsDue?.total || 0);

  const forecastEndBalance = predicted - knownFutureCommitments;

  const smartAlerts: Array<{
    type: string;
    severity: "info" | "warning" | "danger";
    title: string;
    message: string;
  }> = [];

  for (const row of budgetRows as Array<{ limit_amount: number; category_name: string; spent: number }>) {
    const pct = row.limit_amount > 0 ? (row.spent / row.limit_amount) * 100 : 0;
    if (pct >= 100) {
      smartAlerts.push({
        type: "budget",
        severity: "danger",
        title: `${row.category_name} budget exceeded`,
        message: `${Math.round(pct)}% used this salary cycle.`,
      });
    } else if (pct >= 80) {
      smartAlerts.push({
        type: "budget",
        severity: "warning",
        title: `${row.category_name} budget is nearly used`,
        message: `${Math.round(pct)}% used this salary cycle.`,
      });
    }
  }

  if (avgDailySpend > safeToSpendToday && safeToSpendToday > 0) {
    smartAlerts.push({
      type: "pace",
      severity: "warning",
      title: "Spending pace is high",
      message: `Your average is ₹${Math.round(avgDailySpend).toLocaleString("en-IN")}/day vs ₹${Math.round(safeToSpendToday).toLocaleString("en-IN")} safe today.`,
    });
  }

  if (forecastEndBalance < 0) {
    smartAlerts.push({
      type: "forecast",
      severity: "danger",
      title: "Cycle-end forecast needs attention",
      message: `At the current pace and known commitments, you may run short by about ₹${Math.round(Math.abs(forecastEndBalance)).toLocaleString("en-IN")}.`,
    });
  } else if (availableBalance > 0) {
    smartAlerts.push({
      type: "forecast",
      severity: "info",
      title: "Cycle-end forecast",
      message: `About ₹${Math.round(forecastEndBalance).toLocaleString("en-IN")} may remain at the current pace.`,
    });
  }

  return json(
    {
      availableBalance,
      safeToSpendToday,
      spentThisCycle,
      savedThisCycle: savedThisCycleRow?.total || 0,
      upcomingBills,
      cycle,
      currentSalary: latestSalary?.amount || 0,
      recentTransactions,
      smartAlerts: smartAlerts.slice(0, 4),
      forecast: {
        predictedEndBalance: Math.max(0, forecastEndBalance),
        rawPredictedEndBalance: forecastEndBalance,
        avgDailySpend,
        knownFutureCommitments,
      },
    },
    {},
    ctx.origin
  );
}
