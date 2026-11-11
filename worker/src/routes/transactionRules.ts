import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listRules(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(`
    SELECT r.*, c.name AS category_name, c.icon AS category_icon
    FROM transaction_rules r
    JOIN categories c ON c.id=r.category_id
    WHERE r.user_id=?
    ORDER BY r.priority ASC, r.created_at DESC
  `).bind(ctx.userId).all();
  return json(results,{},ctx.origin);
}

export async function createRule(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{match_text?:string;category_id?:string;transaction_type?:"expense"|"income";priority?:number}>();
  const matchText = body.match_text?.trim().toLowerCase();
  if (!matchText || matchText.length < 2 || matchText.length > 60) return errorResponse("Enter a matching phrase between 2 and 60 characters.",400,ctx.origin);
  if (!body.category_id || !body.transaction_type || !["expense","income"].includes(body.transaction_type)) return errorResponse("Choose a category and transaction type.",400,ctx.origin);
  const category = await ctx.env.DB.prepare("SELECT id FROM categories WHERE id=? AND type=? AND (user_id IS NULL OR user_id=?)")
    .bind(body.category_id,body.transaction_type,ctx.userId).first();
  if (!category) return errorResponse("Category not found for this transaction type.",404,ctx.origin);
  const priority = Number.isFinite(Number(body.priority)) ? Math.max(1,Math.min(999,Math.round(Number(body.priority)))) : 100;
  const id = crypto.randomUUID();
  await ctx.env.DB.prepare("INSERT INTO transaction_rules (id,user_id,match_text,category_id,transaction_type,priority) VALUES (?,?,?,?,?,?)")
    .bind(id,ctx.userId,matchText,body.category_id,body.transaction_type,priority).run();
  return json({id,match_text:matchText,category_id:body.category_id,transaction_type:body.transaction_type,priority,is_enabled:1},{status:201},ctx.origin);
}

export async function deleteRule(ctx: Ctx,id:string): Promise<Response> {
  await ctx.env.DB.prepare("DELETE FROM transaction_rules WHERE id=? AND user_id=?").bind(id,ctx.userId).run();
  return json({ok:true},{},ctx.origin);
}
