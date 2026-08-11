import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listLending(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(
    "SELECT * FROM lending_entries WHERE user_id = ? ORDER BY status ASC, due_date IS NULL, due_date ASC, created_at DESC"
  )
    .bind(ctx.userId)
    .all();
  return json(results, {}, ctx.origin);
}

export async function createLending(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    type: "lent" | "borrowed";
    person_name: string;
    amount: number;
    due_date?: string | null;
    note?: string;
  }>();

  if (!body.type || !["lent", "borrowed"].includes(body.type)) {
    return errorResponse("A valid type (lent or borrowed) is required.", 400, ctx.origin);
  }
  if (!body.person_name) return errorResponse("A person's name is required.", 400, ctx.origin);
  if (!body.amount || body.amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    "INSERT INTO lending_entries (id, user_id, type, person_name, amount, due_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, ctx.userId, body.type, body.person_name, body.amount, body.due_date || null, body.note || null)
    .run();

  return json({ id, ...body }, { status: 201 }, ctx.origin);
}

export async function settleLending(ctx: Ctx, id: string): Promise<Response> {
  const entry = await ctx.env.DB.prepare("SELECT amount FROM lending_entries WHERE id = ? AND user_id = ?")
    .bind(id, ctx.userId)
    .first<{ amount: number }>();
  if (!entry) return errorResponse("Entry not found.", 404, ctx.origin);

  await ctx.env.DB.prepare(
    "UPDATE lending_entries SET status = 'settled', settled_amount = amount WHERE id = ?"
  )
    .bind(id)
    .run();

  return json({ ok: true }, {}, ctx.origin);
}
