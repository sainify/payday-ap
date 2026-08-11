import { Ctx } from "../types";
import { json } from "../utils/response";

export async function listCategories(ctx: Ctx): Promise<Response> {
  const type = ctx.url.searchParams.get("type");
  const query = type
    ? ctx.env.DB.prepare(
        "SELECT * FROM categories WHERE (user_id = ? OR user_id IS NULL) AND type = ? ORDER BY is_default DESC, name ASC"
      ).bind(ctx.userId, type)
    : ctx.env.DB.prepare(
        "SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL ORDER BY is_default DESC, name ASC"
      ).bind(ctx.userId);

  const { results } = await query.all();
  return json(results, {}, ctx.origin);
}

export async function createCategory(ctx: Ctx): Promise<Response> {
  const { name, icon, type } = await ctx.req.json<{ name: string; icon?: string; type: "expense" | "income" }>();
  const id = crypto.randomUUID();
  await ctx.env.DB.prepare("INSERT INTO categories (id, user_id, name, icon, type, is_default) VALUES (?, ?, ?, ?, ?, 0)")
    .bind(id, ctx.userId, name, icon || "💳", type)
    .run();
  return json({ id, name, icon: icon || "💳", type }, { status: 201 }, ctx.origin);
}
