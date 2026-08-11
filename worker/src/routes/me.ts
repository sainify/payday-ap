import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function getMe(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare(
    "SELECT id, name, email, currency, salary_cycle_day, created_at FROM users WHERE id = ?"
  )
    .bind(ctx.userId)
    .first();
  const settings = await ctx.env.DB.prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .bind(ctx.userId)
    .first();

  if (!user) return errorResponse("User not found.", 404, ctx.origin);
  return json({ user, settings }, {}, ctx.origin);
}

export async function updateMe(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ name?: string; salary_cycle_day?: number }>();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name) {
    updates.push("name = ?");
    values.push(body.name);
  }
  if (body.salary_cycle_day) {
    updates.push("salary_cycle_day = ?");
    values.push(Math.min(31, Math.max(1, Number(body.salary_cycle_day))));
  }
  if (updates.length === 0) return errorResponse("Nothing to update.", 400, ctx.origin);

  values.push(ctx.userId);
  await ctx.env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ ok: true }, {}, ctx.origin);
}

const SETTINGS_FIELDS = [
  "theme",
  "privacy_mode",
  "pin_enabled",
  "split_needs",
  "split_savings",
  "split_lifestyle",
  "split_goals",
  "split_emergency",
  "notifications_enabled",
];

export async function updateSettings(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<Record<string, unknown>>();
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of SETTINGS_FIELDS) {
    if (field in body) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (updates.length === 0) return errorResponse("Nothing to update.", 400, ctx.origin);

  values.push(ctx.userId);
  await ctx.env.DB.prepare(`UPDATE user_settings SET ${updates.join(", ")} WHERE user_id = ?`)
    .bind(...values)
    .run();

  const settings = await ctx.env.DB.prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .bind(ctx.userId)
    .first();
  return json(settings, {}, ctx.origin);
}
