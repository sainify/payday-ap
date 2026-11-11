import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function getMe(ctx: Ctx): Promise<Response> {
  const user = await ctx.env.DB.prepare("SELECT id,name,email,currency,24 AS salary_cycle_day,created_at FROM users WHERE id=?")
    .bind(ctx.userId).first();
  const settings = await ctx.env.DB.prepare("SELECT * FROM user_settings WHERE user_id=?").bind(ctx.userId).first();
  if (!user) return errorResponse("User not found.",404,ctx.origin);
  return json({user,settings},{},ctx.origin);
}

export async function updateMe(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{name?:string}>();
  if (!body.name?.trim()) return errorResponse("Nothing to update.",400,ctx.origin);
  await ctx.env.DB.prepare("UPDATE users SET name=? WHERE id=?").bind(body.name.trim(),ctx.userId).run();
  return json({ok:true},{},ctx.origin);
}

const SETTINGS_FIELDS=["theme","privacy_mode","pin_enabled","split_needs","split_savings","split_lifestyle","split_goals","split_emergency","notifications_enabled","expected_salary_date","expected_salary_amount","daily_expense_reminder_enabled","daily_expense_reminder_time"];
export async function updateSettings(ctx: Ctx): Promise<Response> {
  const body=await ctx.req.json<Record<string,unknown>>();
  const updates:string[]=[]; const values:unknown[]=[];
  for(const field of SETTINGS_FIELDS){
    if(!(field in body)) continue;
    const value=body[field];
    if(field==="expected_salary_date" && value!==null && (typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))) return errorResponse("Expected salary date must be a valid date.",400,ctx.origin);
    if(field==="expected_salary_amount" && (typeof value!=="number" || !Number.isFinite(value) || value<0)) return errorResponse("Expected salary amount must be zero or greater.",400,ctx.origin);
    if(field==="daily_expense_reminder_enabled" && ![0,1,false,true].includes(value as never)) return errorResponse("Invalid reminder setting.",400,ctx.origin);
    if(field==="daily_expense_reminder_time" && (typeof value!=="string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) return errorResponse("Reminder time must use HH:MM.",400,ctx.origin);
    updates.push(`${field}=?`); values.push(value===true?1:value===false?0:value);
  }
  if(!updates.length) return errorResponse("Nothing to update.",400,ctx.origin);
  values.push(ctx.userId);
  await ctx.env.DB.prepare(`UPDATE user_settings SET ${updates.join(", ")} WHERE user_id=?`).bind(...values).run();
  return json(await ctx.env.DB.prepare("SELECT * FROM user_settings WHERE user_id=?").bind(ctx.userId).first(),{},ctx.origin);
}
