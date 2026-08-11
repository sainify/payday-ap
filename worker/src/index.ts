import { Env } from "./types";
import { errorResponse, corsHeaders } from "./utils/response";
import { parseCookies } from "./utils/auth";

import * as auth from "./routes/auth";
import * as me from "./routes/me";
import * as categories from "./routes/categories";
import * as transactions from "./routes/transactions";
import * as salary from "./routes/salary";
import * as bills from "./routes/bills";
import * as goals from "./routes/goals";
import * as lending from "./routes/lending";
import * as dashboard from "./routes/dashboard";
import * as insights from "./routes/insights";
import * as calendarRoute from "./routes/calendar";
import * as exportRoute from "./routes/export";

// Routes that don't require a logged-in session.
const PUBLIC_PATHS = new Set(["/api/auth/register", "/api/auth/login"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || env.ALLOWED_ORIGIN;
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (!path.startsWith("/api/")) {
      return errorResponse("Not found.", 404, origin);
    }

    // Resolve session -> userId for protected routes.
    let userId: string | null = null;
    if (!PUBLIC_PATHS.has(path)) {
      const cookies = parseCookies(request.headers.get("Cookie"));
      const token = cookies["payday_session"];
      if (!token) return errorResponse("Not authenticated.", 401, origin);

      const session = await env.DB.prepare(
        "SELECT user_id, expires_at FROM sessions WHERE id = ?"
      )
        .bind(token)
        .first<{ user_id: string; expires_at: string }>();

      if (!session || new Date(session.expires_at) < new Date()) {
        return errorResponse("Session expired. Please sign in again.", 401, origin);
      }
      userId = session.user_id;
    }

    const ctx = { req: request, env, url, origin, userId: userId as string };
    const sub = path.replace(/^\/api/, "");
    const segments = sub.split("/").filter(Boolean);

    try {
      // ── Auth ──────────────────────────────────────────────
      if (sub === "/auth/register" && method === "POST") return await auth.register(ctx);
      if (sub === "/auth/login" && method === "POST") return await auth.login(ctx);
      if (sub === "/auth/logout" && method === "POST") return await auth.logout(ctx);
      if (sub === "/auth/set-pin" && method === "POST") return await auth.setPin(ctx);
      if (sub === "/auth/disable-pin" && method === "POST") return await auth.disablePin(ctx);
      if (sub === "/auth/verify-pin" && method === "POST") return await auth.verifyPin(ctx);

      // ── Me / Settings ─────────────────────────────────────
      if (sub === "/me" && method === "GET") return await me.getMe(ctx);
      if (sub === "/me" && method === "PATCH") return await me.updateMe(ctx);
      if (sub === "/settings" && method === "PATCH") return await me.updateSettings(ctx);

      // ── Categories ────────────────────────────────────────
      if (sub === "/categories" && method === "GET") return await categories.listCategories(ctx);
      if (sub === "/categories" && method === "POST") return await categories.createCategory(ctx);

      // ── Transactions ──────────────────────────────────────
      if (sub === "/transactions" && method === "GET") return await transactions.listTransactions(ctx);
      if (sub === "/transactions" && method === "POST") return await transactions.createTransaction(ctx);
      if (segments[0] === "transactions" && segments[1] && method === "DELETE")
        return await transactions.deleteTransaction(ctx, segments[1]);

      // ── Salary ────────────────────────────────────────────
      if (sub === "/salary" && method === "GET") return await salary.listSalary(ctx);
      if (sub === "/salary" && method === "POST") return await salary.createSalary(ctx);

      // ── Bills ─────────────────────────────────────────────
      if (sub === "/bills" && method === "GET") return await bills.listBills(ctx);
      if (sub === "/bills" && method === "POST") return await bills.createBill(ctx);
      if (segments[0] === "bills" && segments[1] && segments[2] === "pay" && method === "PATCH")
        return await bills.markBillPaid(ctx, segments[1]);

      // ── Goals ─────────────────────────────────────────────
      if (sub === "/goals" && method === "GET") return await goals.listGoals(ctx);
      if (sub === "/goals" && method === "POST") return await goals.createGoal(ctx);
      if (segments[0] === "goals" && segments[1] && segments[2] === "contribute" && method === "POST")
        return await goals.contributeToGoal(ctx, segments[1]);

      // ── Lending ───────────────────────────────────────────
      if (sub === "/lending" && method === "GET") return await lending.listLending(ctx);
      if (sub === "/lending" && method === "POST") return await lending.createLending(ctx);
      if (segments[0] === "lending" && segments[1] && segments[2] === "settle" && method === "PATCH")
        return await lending.settleLending(ctx, segments[1]);

      // ── Dashboard ─────────────────────────────────────────
      if (sub === "/dashboard" && method === "GET") return await dashboard.getDashboard(ctx);

      // ── Insights ──────────────────────────────────────────
      if (sub === "/insights/spending-breakdown" && method === "GET") return await insights.spendingBreakdown(ctx);
      if (sub === "/insights/salary-growth" && method === "GET") return await insights.salaryGrowth(ctx);
      if (sub === "/insights/prediction" && method === "GET") return await insights.prediction(ctx);
      if (sub === "/insights/can-i-afford" && method === "POST") return await insights.canIAfford(ctx);

      // ── Calendar ──────────────────────────────────────────
      if (sub === "/calendar" && method === "GET") return await calendarRoute.getCalendar(ctx);

      // ── Export ────────────────────────────────────────────
      if (sub === "/export" && method === "GET") return await exportRoute.exportData(ctx);

      return errorResponse("Not found.", 404, origin);
    } catch (err) {
      console.error(err);
      return errorResponse("Something went wrong on our end. Please try again.", 500, origin);
    }
  },
};
