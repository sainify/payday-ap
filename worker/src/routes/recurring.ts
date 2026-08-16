import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { toISODate } from "../utils/cycle";

export async function listRecurring(ctx: Ctx): Promise<Response> {
  const kind = ctx.url.searchParams.get("kind");
  let sql = `SELECT r.*, c.name AS category_name, c.icon AS category_icon
             FROM recurring_expenses r
             LEFT JOIN categories c ON c.id = r.category_id
             WHERE r.user_id = ?`;
  const params: unknown[] = [ctx.userId];
  if (kind === "subscription") sql += " AND r.is_subscription = 1";
  if (kind === "expense") sql += " AND r.is_subscription = 0";
  sql += " ORDER BY r.active DESC, r.next_due_date ASC, r.title ASC";
  const { results } = await ctx.env.DB.prepare(sql).bind(...params).all();
  return json(results, {}, ctx.origin);
}

export async function createRecurring(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    title: string; amount: number; category_id?: string | null; frequency?: string;
    next_due_date: string; is_subscription?: boolean | number; note?: string;
  }>();
  if (!body.title?.trim()) return errorResponse("A title is required.", 400, ctx.origin);
  if (!body.amount || body.amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  if (!body.next_due_date) return errorResponse("Next due date is required.", 400, ctx.origin);
  const frequency = body.frequency || "monthly";
  if (!["weekly", "monthly", "yearly"].includes(frequency)) return errorResponse("Invalid frequency.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    `INSERT INTO recurring_expenses
      (id, user_id, title, amount, category_id, frequency, next_due_date, is_subscription, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, ctx.userId, body.title.trim(), body.amount, body.category_id || null,
    frequency, body.next_due_date, body.is_subscription ? 1 : 0, body.note || null
  ).run();
  return json({ id, ...body, frequency }, { status: 201 }, ctx.origin);
}

export async function updateRecurring(ctx: Ctx, id: string): Promise<Response> {
  const body = await ctx.req.json<{ active?: boolean | number; amount?: number; next_due_date?: string }>();
  const row = await ctx.env.DB.prepare("SELECT id FROM recurring_expenses WHERE id = ? AND user_id = ?")
    .bind(id, ctx.userId).first();
  if (!row) return errorResponse("Recurring expense not found.", 404, ctx.origin);

  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.active !== undefined) { updates.push("active = ?"); values.push(body.active ? 1 : 0); }
  if (body.amount !== undefined && body.amount > 0) { updates.push("amount = ?"); values.push(body.amount); }
  if (body.next_due_date) { updates.push("next_due_date = ?"); values.push(body.next_due_date); }
  if (!updates.length) return errorResponse("Nothing to update.", 400, ctx.origin);
  values.push(id, ctx.userId);
  await ctx.env.DB.prepare(`UPDATE recurring_expenses SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...values).run();
  return json({ ok: true }, {}, ctx.origin);
}

export async function logRecurring(ctx: Ctx, id: string): Promise<Response> {
  const item = await ctx.env.DB.prepare(
    "SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ? AND active = 1"
  ).bind(id, ctx.userId).first<{
    title: string; amount: number; category_id: string | null; frequency: string; next_due_date: string;
  }>();
  if (!item) return errorResponse("Recurring expense not found.", 404, ctx.origin);

  const txnId = crypto.randomUUID();
  const txnDate = item.next_due_date <= toISODate(new Date()) ? item.next_due_date : toISODate(new Date());
  const next = nextDueDate(item.next_due_date, item.frequency);
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT INTO transactions (id, user_id, type, amount, category_id, note, txn_date) VALUES (?, ?, 'expense', ?, ?, ?, ?)"
    ).bind(txnId, ctx.userId, item.amount, item.category_id, item.title, txnDate),
    ctx.env.DB.prepare("UPDATE recurring_expenses SET next_due_date = ? WHERE id = ? AND user_id = ?")
      .bind(next, id, ctx.userId),
  ]);
  return json({ ok: true, transaction_id: txnId, next_due_date: next }, {}, ctx.origin);
}

export async function deleteRecurring(ctx: Ctx, id: string): Promise<Response> {
  await ctx.env.DB.prepare("DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?").bind(id, ctx.userId).run();
  return json({ ok: true }, {}, ctx.origin);
}

function nextDueDate(date: string, frequency: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
