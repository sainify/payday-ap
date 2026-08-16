import { Ctx } from "../types";
import { corsHeaders, errorResponse } from "../utils/response";

const TABLES = [
  "salary_entries", "transactions", "bills", "goals", "savings_entries", "lending_entries",
  "budgets", "recurring_expenses", "emergency_funds", "debts", "reminder_preferences",
] as const;

export async function exportData(ctx: Ctx): Promise<Response> {
  const format = (ctx.url.searchParams.get("format") || "json").toLowerCase();
  const data: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const { results } = await ctx.env.DB.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).bind(ctx.userId).all();
    data[table] = results as unknown[];
  }

  const user = await ctx.env.DB.prepare("SELECT name, email, salary_cycle_day, currency, created_at FROM users WHERE id = ?")
    .bind(ctx.userId).first();

  if (format === "csv") {
    const rows: string[][] = [["record_type", "date", "title", "amount", "status", "category_or_party", "details"]];
    for (const t of data.transactions as Array<Record<string, unknown>>) rows.push(["transaction", String(t.txn_date || ""), String(t.note || "Transaction"), String(t.amount || 0), String(t.type || ""), String(t.category_id || ""), ""]);
    for (const s of data.salary_entries as Array<Record<string, unknown>>) rows.push(["salary", String(s.salary_date || ""), "Salary", String(s.amount || 0), "income", "", String(s.note || "")]);
    for (const b of data.bills as Array<Record<string, unknown>>) rows.push(["bill", String(b.due_date || ""), String(b.title || "Bill"), String(b.amount || 0), String(b.status || ""), String(b.category || ""), String(b.recurrence || "")]);
    for (const g of data.goals as Array<Record<string, unknown>>) rows.push(["goal", String(g.target_date || ""), String(g.title || "Goal"), String(g.target_amount || 0), "target", "", `saved=${g.saved_amount || 0}`]);
    for (const r of data.recurring_expenses as Array<Record<string, unknown>>) rows.push([r.is_subscription ? "subscription" : "recurring", String(r.next_due_date || ""), String(r.title || "Recurring"), String(r.amount || 0), r.active ? "active" : "paused", String(r.category_id || ""), String(r.frequency || "")]);
    for (const d of data.debts as Array<Record<string, unknown>>) rows.push(["debt", String(d.next_due_date || ""), String(d.title || "Debt"), String(d.outstanding_amount || 0), String(d.status || ""), String(d.lender || ""), `emi=${d.emi_amount || 0}; interest=${d.interest_rate || 0}`]);

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="payday-export.csv"', ...corsHeaders(ctx.origin) } });
  }

  if (format !== "json") return errorResponse("Supported formats are json and csv.", 400, ctx.origin);
  const payload = { exportedAt: new Date().toISOString(), user, ...data };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="payday-export.json"', ...corsHeaders(ctx.origin) },
  });
}

function csvCell(value: string): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
