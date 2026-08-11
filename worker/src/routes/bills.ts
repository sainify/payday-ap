import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listBills(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(
    "SELECT * FROM bills WHERE user_id = ? ORDER BY due_date ASC"
  )
    .bind(ctx.userId)
    .all();
  return json(results, {}, ctx.origin);
}

export async function createBill(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    title: string;
    amount: number;
    due_date: string;
    recurrence?: string;
    category?: string;
  }>();
  if (!body.title) return errorResponse("A title is required.", 400, ctx.origin);
  if (!body.amount || body.amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  if (!body.due_date) return errorResponse("A due date is required.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    "INSERT INTO bills (id, user_id, title, amount, due_date, recurrence, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, ctx.userId, body.title, body.amount, body.due_date, body.recurrence || "monthly", body.category || null)
    .run();

  return json({ id, ...body }, { status: 201 }, ctx.origin);
}

export async function markBillPaid(ctx: Ctx, id: string): Promise<Response> {
  const bill = await ctx.env.DB.prepare("SELECT * FROM bills WHERE id = ? AND user_id = ?")
    .bind(id, ctx.userId)
    .first<{ recurrence: string; due_date: string; amount: number; title: string; category: string | null }>();
  if (!bill) return errorResponse("Bill not found.", 404, ctx.origin);

  await ctx.env.DB.prepare("UPDATE bills SET status = 'paid' WHERE id = ?").bind(id).run();

  // Auto-create next occurrence for recurring bills.
  if (bill.recurrence !== "one_time") {
    const next = nextDueDate(bill.due_date, bill.recurrence);
    const newId = crypto.randomUUID();
    await ctx.env.DB.prepare(
      "INSERT INTO bills (id, user_id, title, amount, due_date, recurrence, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(newId, ctx.userId, bill.title, bill.amount, next, bill.recurrence, bill.category)
      .run();
  }

  return json({ ok: true }, {}, ctx.origin);
}

function nextDueDate(dueDate: string, recurrence: string): string {
  const d = new Date(dueDate + "T00:00:00Z");
  if (recurrence === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (recurrence === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}
