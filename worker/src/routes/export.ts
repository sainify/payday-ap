import { Ctx } from "../types";
import { corsHeaders } from "../utils/response";

export async function exportData(ctx: Ctx): Promise<Response> {
  const tables = ["salary_entries", "transactions", "bills", "goals", "savings_entries", "lending_entries"];
  const data: Record<string, unknown> = {};

  for (const table of tables) {
    const { results } = await ctx.env.DB.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).bind(ctx.userId).all();
    data[table] = results;
  }

  const user = await ctx.env.DB.prepare("SELECT name, email, salary_cycle_day, currency FROM users WHERE id = ?")
    .bind(ctx.userId)
    .first();

  const payload = { exportedAt: new Date().toISOString(), user, ...data };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="payday-export.json"',
      ...corsHeaders(ctx.origin),
    },
  });
}
