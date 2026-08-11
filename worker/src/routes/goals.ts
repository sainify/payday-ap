import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { toISODate } from "../utils/cycle";

export async function listGoals(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC")
    .bind(ctx.userId)
    .all();
  return json(results, {}, ctx.origin);
}

export async function createGoal(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ title: string; target_amount: number; target_date?: string; icon?: string }>();
  if (!body.title) return errorResponse("A goal name is required.", 400, ctx.origin);
  if (!body.target_amount || body.target_amount <= 0)
    return errorResponse("Target amount must be greater than zero.", 400, ctx.origin);

  const id = crypto.randomUUID();
  await ctx.env.DB.prepare(
    "INSERT INTO goals (id, user_id, title, target_amount, target_date, icon) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, ctx.userId, body.title, body.target_amount, body.target_date || null, body.icon || "🎯")
    .run();

  return json({ id, ...body }, { status: 201 }, ctx.origin);
}

export async function contributeToGoal(ctx: Ctx, goalId: string): Promise<Response> {
  const { amount } = await ctx.req.json<{ amount: number }>();
  if (!amount || amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);

  const goal = await ctx.env.DB.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ?")
    .bind(goalId, ctx.userId)
    .first();
  if (!goal) return errorResponse("Goal not found.", 404, ctx.origin);

  const entryId = crypto.randomUUID();
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT INTO savings_entries (id, user_id, goal_id, amount, entry_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(entryId, ctx.userId, goalId, amount, toISODate(new Date())),
    ctx.env.DB.prepare("UPDATE goals SET saved_amount = saved_amount + ? WHERE id = ?").bind(amount, goalId),
  ]);

  return json({ ok: true }, {}, ctx.origin);
}
