import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listTransactions(ctx: Ctx): Promise<Response> {
  const { searchParams } = ctx.url;
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let sql = `
    SELECT t.*, c.name AS category_name, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?`;
  const params: unknown[] = [ctx.userId];

  if (type) {
    sql += " AND t.type = ?";
    params.push(type);
  }
  if (category) {
    sql += " AND t.category_id = ?";
    params.push(category);
  }
  if (from) {
    sql += " AND t.txn_date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND t.txn_date <= ?";
    params.push(to);
  }
  sql += " ORDER BY t.txn_date DESC, t.created_at DESC LIMIT 500";

  const { results } = await ctx.env.DB.prepare(sql).bind(...params).all();
  return json(results, {}, ctx.origin);
}

export async function createTransaction(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    type: "expense" | "income";
    amount: number;
    category_id?: string | null;
    note?: string;
    txn_date: string;
  }>();

  if (!body.type || !["expense", "income"].includes(body.type)) {
    return errorResponse("A valid type (expense or income) is required.", 400, ctx.origin);
  }
  if (!body.amount || body.amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  if (!body.txn_date) return errorResponse("A transaction date is required.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    "INSERT INTO transactions (id, user_id, type, amount, category_id, note, txn_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, ctx.userId, body.type, body.amount, body.category_id || null, body.note || null, body.txn_date)
    .run();

  return json({ id, ...body }, { status: 201 }, ctx.origin);
}

export async function deleteTransaction(ctx: Ctx, id: string): Promise<Response> {
  await ctx.env.DB.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").bind(id, ctx.userId).run();
  return json({ ok: true }, {}, ctx.origin);
}
