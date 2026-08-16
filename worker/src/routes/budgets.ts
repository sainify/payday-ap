import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { getSalaryCycle } from "../utils/cycle";

export async function listBudgets(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT salary_cycle_day FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first<{ salary_cycle_day: number }>();
  if (!user) return errorResponse("User not found.", 404, ctx.origin);

  const cycle = getSalaryCycle(user.salary_cycle_day);
  const { results } = await ctx.env.DB.prepare(
    `SELECT b.id, b.category_id, b.limit_amount, b.created_at, b.updated_at,
            c.name AS category_name, c.icon AS category_icon,
            COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.txn_date >= ? AND t.txn_date <= ? THEN t.amount ELSE 0 END), 0) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id
     WHERE b.user_id = ?
     GROUP BY b.id, b.category_id, b.limit_amount, b.created_at, b.updated_at, c.name, c.icon
     ORDER BY c.name ASC`
  )
    .bind(cycle.start, cycle.end, ctx.userId)
    .all();

  const items = (results as Array<Record<string, unknown> & { limit_amount: number; spent: number }>).map((row) => ({
    ...row,
    remaining: Math.max(0, Number(row.limit_amount) - Number(row.spent || 0)),
    percent_used: Number(row.limit_amount) > 0 ? (Number(row.spent || 0) / Number(row.limit_amount)) * 100 : 0,
  }));

  return json({ cycle, items }, {}, ctx.origin);
}

export async function upsertBudget(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ category_id: string; limit_amount: number }>();
  if (!body.category_id) return errorResponse("Choose a category.", 400, ctx.origin);
  if (!body.limit_amount || body.limit_amount <= 0) return errorResponse("Budget must be greater than zero.", 400, ctx.origin);

  const category = await ctx.env.DB.prepare(
    "SELECT id FROM categories WHERE id = ? AND type = 'expense' AND (user_id IS NULL OR user_id = ?)"
  ).bind(body.category_id, ctx.userId).first();
  if (!category) return errorResponse("Category not found.", 404, ctx.origin);

  const existing = await ctx.env.DB.prepare("SELECT id FROM budgets WHERE user_id = ? AND category_id = ?")
    .bind(ctx.userId, body.category_id)
    .first<{ id: string }>();

  const id = existing?.id || crypto.randomUUID();
  await ctx.env.DB.prepare(
    `INSERT INTO budgets (id, user_id, category_id, limit_amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, category_id) DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = datetime('now')`
  ).bind(id, ctx.userId, body.category_id, body.limit_amount).run();

  return json({ id, ...body }, { status: existing ? 200 : 201 }, ctx.origin);
}

export async function deleteBudget(ctx: Ctx, id: string): Promise<Response> {
  await ctx.env.DB.prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").bind(id, ctx.userId).run();
  return json({ ok: true }, {}, ctx.origin);
}
