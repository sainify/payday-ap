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
  const { amount, salary_date, note, wallet_id } = await ctx.req.json<{ amount: number; salary_date: string; note?: string; wallet_id?: string }>();
  if (!amount || amount <= 0) return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  if (!salary_date || !/^\d{4}-\d{2}-\d{2}$/.test(salary_date)) return errorResponse("A valid salary credit date is required.", 400, ctx.origin);
  if (salary_date > toISODate(new Date())) return errorResponse("A salary credit date cannot be in the future. Use the expected credit date in Profile instead.", 400, ctx.origin);

  const id = crypto.randomUUID();
  const walletId = wallet_id || `wallet_default_${ctx.userId}`;
  await ctx.env.DB.prepare("INSERT OR IGNORE INTO wallets (id,user_id,name,kind,opening_balance,currency) SELECT ?,id,'Main wallet','bank',0,currency FROM users WHERE id=?").bind(`wallet_default_${ctx.userId}`,ctx.userId).run();
  const wallet = await ctx.env.DB.prepare("SELECT id FROM wallets WHERE id=? AND user_id=? AND is_archived=0").bind(walletId,ctx.userId).first();
  if (!wallet) return errorResponse("Wallet not found. Please choose an active wallet.",404,ctx.origin);
  await ctx.env.DB.prepare("INSERT INTO salary_entries (id, user_id, amount, salary_date, note, wallet_id) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, ctx.userId, amount, salary_date, note || null, walletId)
    .run();

  const prefs = await ctx.env.DB.prepare("SELECT auto_allocate_enabled,split_savings,split_goals FROM user_settings WHERE user_id=?")
    .bind(ctx.userId).first<{auto_allocate_enabled:number;split_savings:number;split_goals:number}>();
  if (prefs?.auto_allocate_enabled) {
    const savingsAmount = Math.round(amount * Number(prefs.split_savings || 0)) / 100;
    const goalsAmount = Math.round(amount * Number(prefs.split_goals || 0)) / 100;
    const allocations: D1PreparedStatement[] = [];
    if (savingsAmount > 0) {
      allocations.push(ctx.env.DB.prepare("INSERT INTO savings_entries (id,user_id,goal_id,amount,entry_date,note) VALUES (?,?,NULL,?,?,?)")
        .bind(crypto.randomUUID(),ctx.userId,savingsAmount,salary_date,"Automatic salary savings allocation"));
    }
    if (goalsAmount > 0) {
      const goal = await ctx.env.DB.prepare("SELECT id FROM goals WHERE user_id=? ORDER BY created_at ASC LIMIT 1")
        .bind(ctx.userId).first<{id:string}>();
      if (goal) {
        allocations.push(ctx.env.DB.prepare("INSERT INTO savings_entries (id,user_id,goal_id,amount,entry_date,note) VALUES (?,?,?,?,?,?)")
          .bind(crypto.randomUUID(),ctx.userId,goal.id,goalsAmount,salary_date,"Automatic salary goal allocation"));
        allocations.push(ctx.env.DB.prepare("UPDATE goals SET saved_amount=saved_amount+? WHERE id=? AND user_id=?")
          .bind(goalsAmount,goal.id,ctx.userId));
      } else {
        allocations.push(ctx.env.DB.prepare("INSERT INTO savings_entries (id,user_id,goal_id,amount,entry_date,note) VALUES (?,?,NULL,?,?,?)")
          .bind(crypto.randomUUID(),ctx.userId,goalsAmount,salary_date,"Automatic salary goals allocation (unassigned)"));
      }
    }
    if (allocations.length) await ctx.env.DB.batch(allocations);
  }

  return json({ id, amount, salary_date, note }, { status: 201 }, ctx.origin);
}
