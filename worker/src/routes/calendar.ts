import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function getCalendar(ctx: Ctx): Promise<Response> {
  const month = ctx.url.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return errorResponse("A valid month (YYYY-MM) is required.", 400, ctx.origin);

  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [bills, salary, goals] = await Promise.all([
    ctx.env.DB.prepare("SELECT title, amount, due_date FROM bills WHERE user_id = ? AND due_date >= ? AND due_date <= ?")
      .bind(ctx.userId, start, end)
      .all(),
    ctx.env.DB.prepare("SELECT amount, salary_date FROM salary_entries WHERE user_id = ? AND salary_date >= ? AND salary_date <= ?")
      .bind(ctx.userId, start, end)
      .all(),
    ctx.env.DB.prepare("SELECT title, target_amount, target_date FROM goals WHERE user_id = ? AND target_date >= ? AND target_date <= ?")
      .bind(ctx.userId, start, end)
      .all(),
  ]);

  const events = [
    ...(bills.results as { title: string; amount: number; due_date: string }[]).map((b) => ({
      date: b.due_date,
      type: "bill" as const,
      title: b.title,
      amount: b.amount,
    })),
    ...(salary.results as { amount: number; salary_date: string }[]).map((s) => ({
      date: s.salary_date,
      type: "salary" as const,
      title: "Salary credit",
      amount: s.amount,
    })),
    ...(goals.results as { title: string; target_amount: number; target_date: string }[]).map((g) => ({
      date: g.target_date,
      type: "goal" as const,
      title: `${g.title} target date`,
      amount: g.target_amount,
    })),
  ];

  return json({ events }, {}, ctx.origin);
}
