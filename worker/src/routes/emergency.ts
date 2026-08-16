import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { toISODate } from "../utils/cycle";

export async function getEmergencyFund(ctx: Ctx): Promise<Response> {
  let fund = await ctx.env.DB.prepare("SELECT * FROM emergency_funds WHERE user_id = ?").bind(ctx.userId).first<{
    user_id: string; target_amount: number; saved_amount: number; updated_at: string;
  }>();
  if (!fund) {
    await ctx.env.DB.prepare("INSERT INTO emergency_funds (user_id, target_amount, saved_amount) VALUES (?, 0, 0)")
      .bind(ctx.userId).run();
    fund = { user_id: ctx.userId, target_amount: 0, saved_amount: 0, updated_at: new Date().toISOString() };
  }
  return json({ ...fund, percent: fund.target_amount > 0 ? (fund.saved_amount / fund.target_amount) * 100 : 0 }, {}, ctx.origin);
}

export async function setEmergencyTarget(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ target_amount: number }>();
  if (!body.target_amount || body.target_amount <= 0) return errorResponse("Target must be greater than zero.", 400, ctx.origin);
  await ctx.env.DB.prepare(
    `INSERT INTO emergency_funds (user_id, target_amount, saved_amount) VALUES (?, ?, 0)
     ON CONFLICT(user_id) DO UPDATE SET target_amount = excluded.target_amount, updated_at = datetime('now')`
  ).bind(ctx.userId, body.target_amount).run();
  return json({ ok: true }, {}, ctx.origin);
}

export async function contributeEmergency(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ amount: number; note?: string }>();
  if (!body.amount || body.amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  const fund = await ctx.env.DB.prepare("SELECT user_id FROM emergency_funds WHERE user_id = ?").bind(ctx.userId).first();
  if (!fund) return errorResponse("Set an emergency-fund target first.", 400, ctx.origin);

  const entryId = crypto.randomUUID();
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT INTO savings_entries (id, user_id, goal_id, amount, entry_date, note) VALUES (?, ?, NULL, ?, ?, ?)"
    ).bind(entryId, ctx.userId, body.amount, toISODate(new Date()), body.note || "Emergency fund"),
    ctx.env.DB.prepare("UPDATE emergency_funds SET saved_amount = saved_amount + ?, updated_at = datetime('now') WHERE user_id = ?")
      .bind(body.amount, ctx.userId),
  ]);
  return json({ ok: true }, {}, ctx.origin);
}
