import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listSalary(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(
    "SELECT * FROM salary_entries WHERE user_id = ? ORDER BY salary_date DESC"
  )
    .bind(ctx.userId)
    .all();
  return json(results, {}, ctx.origin);
}

export async function createSalary(ctx: Ctx): Promise<Response> {
  const { amount, salary_date, note } = await ctx.req.json<{ amount: number; salary_date: string; note?: string }>();
  if (!amount || amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  if (!salary_date) return errorResponse("A salary date is required.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare("INSERT INTO salary_entries (id, user_id, amount, salary_date, note) VALUES (?, ?, ?, ?, ?)")
    .bind(id, ctx.userId, amount, salary_date, note || null)
    .run();

  return json({ id, amount, salary_date, note }, { status: 201 }, ctx.origin);
}
