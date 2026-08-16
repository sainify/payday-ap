import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { getSalaryCycle, toISODate } from "../utils/cycle";

export async function getReminderCenter(ctx: Ctx): Promise<Response> {
  let prefs = await ctx.env.DB.prepare("SELECT * FROM reminder_preferences WHERE user_id = ?")
    .bind(ctx.userId).first<Record<string, number>>();
  if (!prefs) {
    await ctx.env.DB.prepare("INSERT INTO reminder_preferences (user_id) VALUES (?)").bind(ctx.userId).run();
    prefs = { bills: 1, budgets: 1, subscriptions: 1, debts: 1, days_before: 2 };
  }

  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId).first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);
  const cycle = getSalaryCycle(user.salary_cycle_day);
  const today = toISODate(new Date());
  const horizonDate = new Date(`${today}T00:00:00Z`);
  horizonDate.setUTCDate(horizonDate.getUTCDate() + Number(prefs.days_before || 2));
  const horizon = horizonDate.toISOString().slice(0, 10);
  const reminders: Array<{ id: string; type: string; severity: "info" | "warning" | "danger"; title: string; message: string; date?: string }> = [];

  if (prefs.bills) {
    const { results } = await ctx.env.DB.prepare(
      "SELECT id, title, amount, due_date FROM bills WHERE user_id = ? AND status = 'pending' AND due_date >= ? AND due_date <= ? ORDER BY due_date"
    ).bind(ctx.userId, today, horizon).all();
    for (const b of results as Array<{ id: string; title: string; amount: number; due_date: string }>) {
      reminders.push({ id: `bill-${b.id}`, type: "bill", severity: b.due_date === today ? "danger" : "warning", title: `${b.title} is due soon`, message: `₹${Math.round(b.amount).toLocaleString("en-IN")} due ${b.due_date}`, date: b.due_date });
    }
  }

  if (prefs.subscriptions) {
    const { results } = await ctx.env.DB.prepare(
      "SELECT id, title, amount, next_due_date FROM recurring_expenses WHERE user_id = ? AND active = 1 AND is_subscription = 1 AND next_due_date >= ? AND next_due_date <= ? ORDER BY next_due_date"
    ).bind(ctx.userId, today, horizon).all();
    for (const s of results as Array<{ id: string; title: string; amount: number; next_due_date: string }>) {
      reminders.push({ id: `sub-${s.id}`, type: "subscription", severity: "info", title: `${s.title} renewal`, message: `₹${Math.round(s.amount).toLocaleString("en-IN")} scheduled`, date: s.next_due_date });
    }
  }

  if (prefs.debts) {
    const { results } = await ctx.env.DB.prepare(
      "SELECT id, title, emi_amount, next_due_date FROM debts WHERE user_id = ? AND status = 'active' AND next_due_date >= ? AND next_due_date <= ? ORDER BY next_due_date"
    ).bind(ctx.userId, today, horizon).all();
    for (const d of results as Array<{ id: string; title: string; emi_amount: number; next_due_date: string }>) {
      reminders.push({ id: `debt-${d.id}`, type: "debt", severity: "warning", title: `${d.title} payment`, message: `₹${Math.round(d.emi_amount).toLocaleString("en-IN")} EMI due`, date: d.next_due_date });
    }
  }

  if (prefs.budgets) {
    const { results } = await ctx.env.DB.prepare(
      `SELECT b.id, b.limit_amount, c.name AS category_name, COALESCE(SUM(t.amount),0) AS spent
       FROM budgets b JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id AND t.type = 'expense' AND t.txn_date >= ? AND t.txn_date <= ?
       WHERE b.user_id = ? GROUP BY b.id, b.limit_amount, c.name`
    ).bind(cycle.start, cycle.end, ctx.userId).all();
    for (const b of results as Array<{ id: string; limit_amount: number; category_name: string; spent: number }>) {
      const pct = b.limit_amount > 0 ? (b.spent / b.limit_amount) * 100 : 0;
      if (pct >= 80) reminders.push({ id: `budget-${b.id}`, type: "budget", severity: pct >= 100 ? "danger" : "warning", title: `${b.category_name} budget ${pct >= 100 ? "exceeded" : "is nearly used"}`, message: `${Math.round(pct)}% of this cycle's budget used` });
    }
  }

  return json({ preferences: prefs, reminders }, {}, ctx.origin);
}

export async function updateReminderPreferences(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ bills?: number | boolean; budgets?: number | boolean; subscriptions?: number | boolean; debts?: number | boolean; days_before?: number }>();
  const fields = ["bills", "budgets", "subscriptions", "debts"] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of fields) if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f] ? 1 : 0); }
  if (body.days_before !== undefined) { sets.push("days_before = ?"); vals.push(Math.min(14, Math.max(0, Number(body.days_before)))); }
  if (!sets.length) return errorResponse("Nothing to update.", 400, ctx.origin);

  await ctx.env.DB.prepare("INSERT OR IGNORE INTO reminder_preferences (user_id) VALUES (?)").bind(ctx.userId).run();
  vals.push(ctx.userId);
  await ctx.env.DB.prepare(`UPDATE reminder_preferences SET ${sets.join(", ")}, updated_at = datetime('now') WHERE user_id = ?`)
    .bind(...vals).run();
  const prefs = await ctx.env.DB.prepare("SELECT * FROM reminder_preferences WHERE user_id = ?").bind(ctx.userId).first();
  return json(prefs, {}, ctx.origin);
}
