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
    next_due_date: string; is_subscription?: boolean | number; note?: string; auto_post_enabled?: boolean | number;
  }>();
  if (!body.title?.trim()) return errorResponse("A title is required.", 400, ctx.origin);
  if (!body.amount || body.amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  if (!body.next_due_date) return errorResponse("Next due date is required.", 400, ctx.origin);
  const frequency = body.frequency || "monthly";
  if (!["weekly", "monthly", "yearly"].includes(frequency)) return errorResponse("Invalid frequency.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    `INSERT INTO recurring_expenses
      (id, user_id, title, amount, category_id, frequency, next_due_date, is_subscription, note, auto_post_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, ctx.userId, body.title.trim(), body.amount, body.category_id || null,
    frequency, body.next_due_date, body.is_subscription ? 1 : 0, body.note || null, body.auto_post_enabled ? 1 : 0
  ).run();
  return json({ id, ...body, frequency, auto_post_enabled: body.auto_post_enabled ? 1 : 0 }, { status: 201 }, ctx.origin);
}

export async function updateRecurring(ctx: Ctx, id: string): Promise<Response> {
  const body = await ctx.req.json<{ active?: boolean | number; amount?: number; next_due_date?: string; auto_post_enabled?: boolean | number }>();
  const row = await ctx.env.DB.prepare("SELECT id FROM recurring_expenses WHERE id = ? AND user_id = ?")
    .bind(id, ctx.userId).first();
  if (!row) return errorResponse("Recurring expense not found.", 404, ctx.origin);

  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.active !== undefined) { updates.push("active = ?"); values.push(body.active ? 1 : 0); }
  if (body.amount !== undefined && body.amount > 0) { updates.push("amount = ?"); values.push(body.amount); }
  if (body.next_due_date) { updates.push("next_due_date = ?"); values.push(body.next_due_date); }
  if (body.auto_post_enabled !== undefined) { updates.push("auto_post_enabled = ?"); values.push(body.auto_post_enabled ? 1 : 0); }
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
  const walletId = `wallet_default_${ctx.userId}`;
  await ctx.env.DB.prepare("INSERT OR IGNORE INTO wallets (id,user_id,name,kind,opening_balance,currency) SELECT ?,id,'Main wallet','bank',0,currency FROM users WHERE id=?").bind(walletId,ctx.userId).run();
  const txnDate = item.next_due_date <= toISODate(new Date()) ? item.next_due_date : toISODate(new Date());
  const next = nextDueDate(item.next_due_date, item.frequency);
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT INTO transactions (id, user_id, type, amount, category_id, note, txn_date, wallet_id) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?)"
    ).bind(txnId, ctx.userId, item.amount, item.category_id, item.title, txnDate, walletId),
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
  const [year,month,day]=date.split("-").map(Number);
  if(frequency==="weekly") {
    const d=new Date(Date.UTC(year,month-1,day+7));
    return d.toISOString().slice(0,10);
  }
  const targetYear=frequency==="yearly"?year+1:year;
  const targetMonth=frequency==="yearly"?month:month+1;
  const normalizedYear=targetMonth>12?targetYear+1:targetYear;
  const normalizedMonth=targetMonth>12?1:targetMonth;
  const lastDay=new Date(Date.UTC(normalizedYear,normalizedMonth,0)).getUTCDate();
  return `${normalizedYear}-${String(normalizedMonth).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
}
