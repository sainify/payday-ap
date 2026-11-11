import { Ctx } from "../types";
import { corsHeaders, errorResponse } from "../utils/response";

const TABLES = [
  "categories", "wallets", "salary_entries", "transactions", "bills", "goals", "savings_entries", "lending_entries",
  "budgets", "recurring_expenses", "emergency_funds", "debts", "reminder_preferences", "receipts", "wallet_transfers", "transaction_rules", "transaction_splits", "user_settings",
] as const;

export async function exportData(ctx: Ctx): Promise<Response> {
  const format = (ctx.url.searchParams.get("format") || "json").toLowerCase();
  const data: Record<string, unknown[]> = {};
  const from = ctx.url.searchParams.get("from");
  const to = ctx.url.searchParams.get("to");
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from > to)) return errorResponse("Use a valid statement date range.",400,ctx.origin);

  for (const table of TABLES) {
    let sql = `SELECT * FROM ${table} WHERE user_id = ?`;
    const params: unknown[] = [ctx.userId];
    if (table === "transactions") { if (from) { sql += " AND txn_date >= ?"; params.push(from); } if (to) { sql += " AND txn_date <= ?"; params.push(to); } }
    if (table === "salary_entries") { if (from) { sql += " AND salary_date >= ?"; params.push(from); } if (to) { sql += " AND salary_date <= ?"; params.push(to); } }
    const { results } = await ctx.env.DB.prepare(sql).bind(...params).all();
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
    for (const w of data.wallets as Array<Record<string, unknown>>) rows.push(["wallet", "", String(w.name || "Wallet"), String(w.opening_balance || 0), String(w.is_archived ? "archived" : "active"), String(w.kind || ""), String(w.currency || "INR")]);
    for (const x of data.wallet_transfers as Array<Record<string, unknown>>) rows.push(["wallet_transfer", String(x.transfer_date || ""), "Wallet transfer", String(x.amount || 0), "completed", String(x.from_wallet_id || ""), String(x.to_wallet_id || "")]);

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


export async function restoreData(ctx: Ctx): Promise<Response> {
  const raw = await ctx.req.text();
  if (raw.length > 3_000_000) return errorResponse("Backup is too large (maximum 3 MB).",413,ctx.origin);
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; }
  catch { return errorResponse("The selected backup is not valid JSON.",400,ctx.origin); }
  const source = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : payload;
  const tables = [
    "categories", "wallets", "goals", "transactions", "salary_entries",
    "bills", "savings_entries", "lending_entries", "budgets",
    "recurring_expenses", "emergency_funds", "debts", "reminder_preferences",
    "receipts", "user_settings", "wallet_transfers", "transaction_rules",
  ] as const;
  let restored = 0;
  let processed = 0;
  const statements: D1PreparedStatement[] = [];
  for (const table of tables) {
    const rows = source[table];
    if (!Array.isArray(rows)) continue;
    if (rows.length > 1000) return errorResponse(`Backup contains too many ${table} records.`,400,ctx.origin);
    const info = await ctx.env.DB.prepare(`PRAGMA table_info(${table})`).all<{name:string}>();
    const allowed = new Set(info.results.map(column => column.name));
    if (!allowed.has("user_id")) continue;
    for (const rawRow of rows) {
      if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) continue;
      const row = rawRow as Record<string, unknown>;
      if (table === "categories" && row.user_id == null) continue;
      const keys = Object.keys(row).filter(key => allowed.has(key) && key !== "user_id");
      if (keys.some(key => row[key] !== null && !["string","number","boolean"].includes(typeof row[key]))) continue;
      processed += 1;
      if (processed > 5000) return errorResponse("Backup contains too many records (maximum 5,000).",400,ctx.origin);
      if (!keys.includes("id") && table !== "user_settings") continue;
      const columns = ["user_id", ...keys];
      const values = [ctx.userId, ...keys.map(key => row[key])];
      const placeholders = columns.map(() => "?").join(",");
      statements.push(ctx.env.DB.prepare(
        `INSERT OR IGNORE INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`
      ).bind(...values));
      if (statements.length >= 50) {
        await ctx.env.DB.batch(statements.splice(0,50));
        restored += 50;
      }
    }
  }
  if (statements.length) {
    await ctx.env.DB.batch(statements);
    restored += statements.length;
  }
  return new Response(JSON.stringify({ok:true,restored,mode:"merge"}), {
    headers: { "Content-Type":"application/json", ...corsHeaders(ctx.origin) }
  });
}
