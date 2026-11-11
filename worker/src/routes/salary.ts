import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { toISODate } from "../utils/cycle";

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
  if (!salary_date || !/^\d{4}-\d{2}-\d{2}$/.test(salary_date)) return errorResponse("A valid salary credit date is required.", 400, ctx.origin);
  if (salary_date > toISODate(new Date())) return errorResponse("A salary credit date cannot be in the future. Use the expected credit date in Profile instead.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare("INSERT INTO salary_entries (id, user_id, amount, salary_date, note) VALUES (?, ?, ?, ?, ?)")
    .bind(id, ctx.userId, amount, salary_date, note || null)
    .run();

  return json({ id, amount, salary_date, note }, { status: 201 }, ctx.origin);
}
