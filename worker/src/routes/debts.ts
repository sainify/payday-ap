import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { toISODate } from "../utils/cycle";

export async function listDebts(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare("SELECT * FROM debts WHERE user_id = ? ORDER BY status ASC, next_due_date ASC, created_at DESC")
    .bind(ctx.userId).all();
  return json(results, {}, ctx.origin);
}

export async function createDebt(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    title: string; lender?: string; principal_amount: number; outstanding_amount?: number;
    emi_amount?: number; interest_rate?: number; next_due_date?: string; note?: string;
  }>();
  if (!body.title?.trim()) return errorResponse("A debt name is required.", 400, ctx.origin);
  if (!body.principal_amount || body.principal_amount <= 0) return errorResponse("Principal must be greater than zero.", 400, ctx.origin);
  const outstanding = body.outstanding_amount ?? body.principal_amount;
  if (outstanding < 0) return errorResponse("Outstanding amount cannot be negative.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    `INSERT INTO debts
      (id, user_id, title, lender, principal_amount, outstanding_amount, emi_amount, interest_rate, next_due_date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, ctx.userId, body.title.trim(), body.lender || null, body.principal_amount, outstanding,
    body.emi_amount || 0, body.interest_rate || 0, body.next_due_date || null, body.note || null
  ).run();
  return json({ id, ...body, outstanding_amount: outstanding }, { status: 201 }, ctx.origin);
}

export async function payDebt(ctx: Ctx, id: string): Promise<Response> {
  const { amount } = await ctx.req.json<{ amount: number }>();
  if (!amount || amount <= 0) return errorResponse("Payment must be greater than zero.", 400, ctx.origin);
  const debt = await ctx.env.DB.prepare("SELECT * FROM debts WHERE id = ? AND user_id = ?")
    .bind(id, ctx.userId).first<{ title: string; outstanding_amount: number; next_due_date: string | null; status: string }>();
  if (!debt) return errorResponse("Debt not found.", 404, ctx.origin);
  if (debt.status === "paid") return errorResponse("This debt is already paid.", 400, ctx.origin);

  const applied = Math.min(amount, debt.outstanding_amount);
  const remaining = Math.max(0, debt.outstanding_amount - applied);
  const status = remaining <= 0 ? "paid" : "active";
  const next = status === "paid" || !debt.next_due_date ? debt.next_due_date : nextMonth(debt.next_due_date);
  const txnId = crypto.randomUUID();

  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT INTO transactions (id, user_id, type, amount, category_id, note, txn_date) VALUES (?, ?, 'expense', ?, 'cat_emi', ?, ?)"
    ).bind(txnId, ctx.userId, applied, `Debt payment · ${debt.title}`, toISODate(new Date())),
    ctx.env.DB.prepare("UPDATE debts SET outstanding_amount = ?, status = ?, next_due_date = ? WHERE id = ? AND user_id = ?")
      .bind(remaining, status, next, id, ctx.userId),
  ]);

  return json({ ok: true, applied, outstanding_amount: remaining, status, next_due_date: next }, {}, ctx.origin);
}

export async function deleteDebt(ctx: Ctx, id: string): Promise<Response> {
  await ctx.env.DB.prepare("DELETE FROM debts WHERE id = ? AND user_id = ?").bind(id, ctx.userId).run();
  return json({ ok: true }, {}, ctx.origin);
}

function nextMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
