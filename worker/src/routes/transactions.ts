import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listTransactions(ctx: Ctx): Promise<Response> {
  const { searchParams } = ctx.url;
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q")?.trim();
  const min = searchParams.get("min");
  const max = searchParams.get("max");

  let sql = `
    SELECT t.*, c.name AS category_name, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?`;
  const params: unknown[] = [ctx.userId];

  if (type && ["expense", "income"].includes(type)) {
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
  if (q) {
    sql += " AND (LOWER(COALESCE(t.note,'')) LIKE ? OR LOWER(COALESCE(c.name,'')) LIKE ?)";
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like);
  }
  if (min && Number.isFinite(Number(min))) {
    sql += " AND t.amount >= ?";
    params.push(Number(min));
  }
  if (max && Number.isFinite(Number(max))) {
    sql += " AND t.amount <= ?";
    params.push(Number(max));
  }

  sql += " ORDER BY t.txn_date DESC, t.created_at DESC LIMIT 500";

  const { results } = await ctx.env.DB.prepare(sql).bind(...params).all();
  return json(results, {}, ctx.origin);
}

export async function createTransaction(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    id?: string;
    type: "expense" | "income";
    amount: number;
    category_id?: string | null;
    note?: string | null;
    txn_date: string;
  }>();

  if (!body.type || !["expense", "income"].includes(body.type)) {
    return errorResponse("A valid type (expense or income) is required.", 400, ctx.origin);
  }
  if (!body.amount || body.amount <= 0) {
    return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  }
  if (!body.txn_date) {
    return errorResponse("A transaction date is required.", 400, ctx.origin);
  }

  const editId = body.id || ctx.url.searchParams.get("edit_id") || undefined;

  if (editId) {
    const existing = await ctx.env.DB.prepare(
      "SELECT id, type FROM transactions WHERE id = ? AND user_id = ?"
    )
      .bind(editId, ctx.userId)
      .first<{ id: string; type: "expense" | "income" }>();

    if (!existing) {
      return errorResponse("Transaction not found. No new transaction was created.", 404, ctx.origin);
    }

    if (body.type !== existing.type) {
      return errorResponse("Transaction type cannot be changed.", 400, ctx.origin);
    }

    if (body.category_id) {
      const category = await ctx.env.DB.prepare(
        "SELECT id FROM categories WHERE id = ? AND type = ? AND (user_id IS NULL OR user_id = ?)"
      )
        .bind(body.category_id, existing.type, ctx.userId)
        .first();

      if (!category) {
        return errorResponse("Category not found.", 404, ctx.origin);
      }
    }

    await ctx.env.DB.prepare(
      "UPDATE transactions SET amount = ?, category_id = ?, note = ?, txn_date = ? WHERE id = ? AND user_id = ?"
    )
      .bind(
        body.amount,
        body.category_id || null,
        body.note || null,
        body.txn_date,
        editId,
        ctx.userId
      )
      .run();

    return json(
      {
        id: editId,
        type: existing.type,
        amount: body.amount,
        category_id: body.category_id || null,
        note: body.note || null,
        txn_date: body.txn_date,
        updated: true,
      },
      {},
      ctx.origin
    );
  }

  if (body.category_id) {
    const category = await ctx.env.DB.prepare(
      "SELECT id FROM categories WHERE id = ? AND type = ? AND (user_id IS NULL OR user_id = ?)"
    )
      .bind(body.category_id, body.type, ctx.userId)
      .first();

    if (!category) {
      return errorResponse("Category not found.", 404, ctx.origin);
    }
  }

  const id = crypto.randomUUID();

  await ctx.env.DB.prepare(
    "INSERT INTO transactions (id, user_id, type, amount, category_id, note, txn_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      ctx.userId,
      body.type,
      body.amount,
      body.category_id || null,
      body.note || null,
      body.txn_date
    )
    .run();

  return json(
    {
      id,
      type: body.type,
      amount: body.amount,
      category_id: body.category_id || null,
      note: body.note || null,
      txn_date: body.txn_date,
    },
    { status: 201 },
    ctx.origin
  );
}

export async function deleteTransaction(ctx: Ctx, id: string): Promise<Response> {
  await ctx.env.DB.prepare(
    "DELETE FROM transactions WHERE id = ? AND user_id = ?"
  )
    .bind(id, ctx.userId)
    .run();

  return json({ ok: true }, {}, ctx.origin);
}
