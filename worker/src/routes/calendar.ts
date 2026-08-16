import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function getCalendar(ctx: Ctx): Promise<Response> {
  const month = ctx.url.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return errorResponse("A valid month (YYYY-MM) is required.", 400, ctx.origin);

  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [bills, salary, goals, transactions, recurring, debts] = await Promise.all([
    ctx.env.DB.prepare("SELECT id, title, amount, due_date FROM bills WHERE user_id = ? AND due_date >= ? AND due_date <= ?")
      .bind(ctx.userId, start, end).all(),
    ctx.env.DB.prepare("SELECT id, amount, salary_date FROM salary_entries WHERE user_id = ? AND salary_date >= ? AND salary_date <= ?")
      .bind(ctx.userId, start, end).all(),
    ctx.env.DB.prepare("SELECT id, title, target_amount, target_date FROM goals WHERE user_id = ? AND target_date >= ? AND target_date <= ?")
      .bind(ctx.userId, start, end).all(),
    ctx.env.DB.prepare(
      `SELECT t.id, t.type, t.amount, t.txn_date, t.note, c.name AS category_name
       FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
       WHERE t.user_id=? AND t.txn_date >= ? AND t.txn_date <= ? ORDER BY t.txn_date DESC LIMIT 300`
    ).bind(ctx.userId, start, end).all(),
    ctx.env.DB.prepare(
      "SELECT id, title, amount, next_due_date, is_subscription FROM recurring_expenses WHERE user_id = ? AND active = 1 AND next_due_date >= ? AND next_due_date <= ?"
    ).bind(ctx.userId, start, end).all(),
    ctx.env.DB.prepare(
      "SELECT id, title, emi_amount, next_due_date FROM debts WHERE user_id = ? AND status = 'active' AND next_due_date >= ? AND next_due_date <= ?"
    ).bind(ctx.userId, start, end).all(),
  ]);

  const events = [
    ...(bills.results as Array<{ id: string; title: string; amount: number; due_date: string }>).map((b) => ({
      id: `bill-${b.id}`, date: b.due_date, type: "bill" as const, title: b.title, amount: b.amount,
    })),
    ...(salary.results as Array<{ id: string; amount: number; salary_date: string }>).map((s) => ({
      id: `salary-${s.id}`, date: s.salary_date, type: "salary" as const, title: "Salary credit", amount: s.amount,
    })),
    ...(goals.results as Array<{ id: string; title: string; target_amount: number; target_date: string }>).map((g) => ({
      id: `goal-${g.id}`, date: g.target_date, type: "goal" as const, title: `${g.title} target date`, amount: g.target_amount,
    })),
    ...(transactions.results as Array<{ id: string; type: "expense" | "income"; amount: number; txn_date: string; note: string | null; category_name: string | null }>).map((t) => ({
      id: `txn-${t.id}`, date: t.txn_date, type: t.type as "expense" | "income", title: t.note || t.category_name || (t.type === "expense" ? "Expense" : "Income"), amount: t.amount,
    })),
    ...(recurring.results as Array<{ id: string; title: string; amount: number; next_due_date: string; is_subscription: number }>).map((r) => ({
      id: `recurring-${r.id}`, date: r.next_due_date, type: r.is_subscription ? "subscription" as const : "recurring" as const, title: r.title, amount: r.amount,
    })),
    ...(debts.results as Array<{ id: string; title: string; emi_amount: number; next_due_date: string }>).map((d) => ({
      id: `debt-${d.id}`, date: d.next_due_date, type: "debt" as const, title: `${d.title} EMI`, amount: d.emi_amount,
    })),
  ];

  return json({ events }, {}, ctx.origin);
}
