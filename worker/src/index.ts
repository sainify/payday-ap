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
import * as budgets from "./routes/budgets";
import * as recurring from "./routes/recurring";
import * as emergency from "./routes/emergency";
import * as debts from "./routes/debts";
import * as notifications from "./routes/notifications";
import * as receipts from "./routes/receipts";

// Routes that don't require a logged-in session.
const PUBLIC_PATHS = new Set([
  "/api/auth/register",
  "/api/auth/login",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin");
    const allowedOrigin =
      env.ALLOWED_ORIGIN || "https://payday-ap.pages.dev";

    const origin = requestOrigin || allowedOrigin;
    const path = url.pathname;
    const method = request.method;

    // Allow production PAYDAY Pages domain + Cloudflare preview deployments.
    const isPaydayPagesOrigin = (() => {
      if (!requestOrigin) return false;

      try {
        const hostname = new URL(requestOrigin).hostname;

        return (
          hostname === "payday-ap.pages.dev" ||
          hostname.endsWith(".payday-ap.pages.dev")
        );
      } catch {
        return false;
      }
    })();

    // Keep credentialed requests restricted to PAYDAY frontend.
    if (
      requestOrigin &&
      requestOrigin !== allowedOrigin &&
      requestOrigin !== "http://localhost:5173" &&
      !isPaydayPagesOrigin
    ) {
      return errorResponse(
        "Origin not allowed.",
        403,
        allowedOrigin
      );
    }

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    if (!path.startsWith("/api/")) {
      return errorResponse("Not found.", 404, origin);
    }

    // Resolve session -> userId for protected routes.
    let userId: string | null = null;

    if (!PUBLIC_PATHS.has(path)) {
      const cookies = parseCookies(
        request.headers.get("Cookie")
      );

      const token = cookies["payday_session"];

      if (!token) {
        return errorResponse(
          "Not authenticated.",
          401,
          origin
        );
      }

      const session = await env.DB.prepare(
        "SELECT user_id, expires_at FROM sessions WHERE id = ?"
      )
        .bind(token)
        .first<{
          user_id: string;
          expires_at: string;
        }>();

      if (
        !session ||
        new Date(session.expires_at) < new Date()
      ) {
        return errorResponse(
          "Session expired. Please sign in again.",
          401,
          origin
        );
      }

      userId = session.user_id;
    }

    const ctx = {
      req: request,
      env,
      url,
      origin,
      userId: userId as string,
    };

    const sub = path.replace(/^\/api/, "");
    const segments = sub
      .split("/")
      .filter(Boolean);

    try {
      // ─────────────────────────────────────────
      // AUTH
      // ─────────────────────────────────────────

      if (
        sub === "/auth/register" &&
        method === "POST"
      ) {
        return await auth.register(ctx);
      }

      if (
        sub === "/auth/login" &&
        method === "POST"
      ) {
        return await auth.login(ctx);
      }

      if (
        sub === "/auth/logout" &&
        method === "POST"
      ) {
        return await auth.logout(ctx);
      }

      if (
        sub === "/auth/set-pin" &&
        method === "POST"
      ) {
        return await auth.setPin(ctx);
      }

      if (
        sub === "/auth/disable-pin" &&
        method === "POST"
      ) {
        return await auth.disablePin(ctx);
      }

      if (
        sub === "/auth/verify-pin" &&
        method === "POST"
      ) {
        return await auth.verifyPin(ctx);
      }

      // ─────────────────────────────────────────
      // ME / SETTINGS
      // ─────────────────────────────────────────

      if (
        sub === "/me" &&
        method === "GET"
      ) {
        return await me.getMe(ctx);
      }

      if (
        sub === "/me" &&
        method === "PATCH"
      ) {
        return await me.updateMe(ctx);
      }

      if (
        sub === "/settings" &&
        method === "PATCH"
      ) {
        return await me.updateSettings(ctx);
      }

      // ─────────────────────────────────────────
      // CATEGORIES
      // ─────────────────────────────────────────

      if (
        sub === "/categories" &&
        method === "GET"
      ) {
        return await categories.listCategories(ctx);
      }

      if (
        sub === "/categories" &&
        method === "POST"
      ) {
        return await categories.createCategory(ctx);
      }

      // ─────────────────────────────────────────
      // TRANSACTIONS
      // ─────────────────────────────────────────

      if (
        sub === "/transactions" &&
        method === "GET"
      ) {
        return await transactions.listTransactions(ctx);
      }

      if (
        sub === "/transactions" &&
        method === "POST"
      ) {
        return await transactions.createTransaction(ctx);
      }

      if (
        segments[0] === "transactions" &&
        segments[1] &&
        method === "DELETE"
      ) {
        return await transactions.deleteTransaction(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // SALARY
      // ─────────────────────────────────────────

      if (
        sub === "/salary" &&
        method === "GET"
      ) {
        return await salary.listSalary(ctx);
      }

      if (
        sub === "/salary" &&
        method === "POST"
      ) {
        return await salary.createSalary(ctx);
      }

      // ─────────────────────────────────────────
      // BILLS
      // ─────────────────────────────────────────

      if (
        sub === "/bills" &&
        method === "GET"
      ) {
        return await bills.listBills(ctx);
      }

      if (
        sub === "/bills" &&
        method === "POST"
      ) {
        return await bills.createBill(ctx);
      }

      if (
        segments[0] === "bills" &&
        segments[1] &&
        segments[2] === "pay" &&
        method === "PATCH"
      ) {
        return await bills.markBillPaid(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // GOALS
      // ─────────────────────────────────────────

      if (
        sub === "/goals" &&
        method === "GET"
      ) {
        return await goals.listGoals(ctx);
      }

      if (
        sub === "/goals" &&
        method === "POST"
      ) {
        return await goals.createGoal(ctx);
      }

      if (
        segments[0] === "goals" &&
        segments[1] &&
        segments[2] === "contribute" &&
        method === "POST"
      ) {
        return await goals.contributeToGoal(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // LENDING
      // ─────────────────────────────────────────

      if (
        sub === "/lending" &&
        method === "GET"
      ) {
        return await lending.listLending(ctx);
      }

      if (
        sub === "/lending" &&
        method === "POST"
      ) {
        return await lending.createLending(ctx);
      }

      if (
        segments[0] === "lending" &&
        segments[1] &&
        segments[2] === "settle" &&
        method === "PATCH"
      ) {
        return await lending.settleLending(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // BUDGETS
      // ─────────────────────────────────────────

      if (
        sub === "/budgets" &&
        method === "GET"
      ) {
        return await budgets.listBudgets(ctx);
      }

      if (
        sub === "/budgets" &&
        method === "POST"
      ) {
        return await budgets.upsertBudget(ctx);
      }

      if (
        segments[0] === "budgets" &&
        segments[1] &&
        method === "DELETE"
      ) {
        return await budgets.deleteBudget(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // RECURRING
      // ─────────────────────────────────────────

      if (
        sub === "/recurring" &&
        method === "GET"
      ) {
        return await recurring.listRecurring(ctx);
      }

      if (
        sub === "/recurring" &&
        method === "POST"
      ) {
        return await recurring.createRecurring(ctx);
      }

      if (
        segments[0] === "recurring" &&
        segments[1] &&
        segments[2] === "log" &&
        method === "POST"
      ) {
        return await recurring.logRecurring(
          ctx,
          segments[1]
        );
      }

      if (
        segments[0] === "recurring" &&
        segments[1] &&
        method === "PATCH"
      ) {
        return await recurring.updateRecurring(
          ctx,
          segments[1]
        );
      }

      if (
        segments[0] === "recurring" &&
        segments[1] &&
        method === "DELETE"
      ) {
        return await recurring.deleteRecurring(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // EMERGENCY FUND
      // ─────────────────────────────────────────

      if (
        sub === "/emergency-fund" &&
        method === "GET"
      ) {
        return await emergency.getEmergencyFund(ctx);
      }

      if (
        sub === "/emergency-fund" &&
        method === "PATCH"
      ) {
        return await emergency.setEmergencyTarget(ctx);
      }

      if (
        sub === "/emergency-fund/contribute" &&
        method === "POST"
      ) {
        return await emergency.contributeEmergency(ctx);
      }

      // ─────────────────────────────────────────
      // DEBTS / EMI
      // ─────────────────────────────────────────

      if (
        sub === "/debts" &&
        method === "GET"
      ) {
        return await debts.listDebts(ctx);
      }

      if (
        sub === "/debts" &&
        method === "POST"
      ) {
        return await debts.createDebt(ctx);
      }

      if (
        segments[0] === "debts" &&
        segments[1] &&
        segments[2] === "pay" &&
        method === "POST"
      ) {
        return await debts.payDebt(
          ctx,
          segments[1]
        );
      }

      if (
        segments[0] === "debts" &&
        segments[1] &&
        method === "DELETE"
      ) {
        return await debts.deleteDebt(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // NOTIFICATIONS
      // ─────────────────────────────────────────

      if (
        sub === "/notifications" &&
        method === "GET"
      ) {
        return await notifications.getReminderCenter(ctx);
      }

      if (
        sub === "/notifications/preferences" &&
        method === "PATCH"
      ) {
        return await notifications.updateReminderPreferences(
          ctx
        );
      }

      // ─────────────────────────────────────────
      // AI EXPENSE SCANNER / RECEIPT VAULT
      // ─────────────────────────────────────────

      if (
        sub === "/receipts" &&
        method === "GET"
      ) {
        return await receipts.listReceipts(ctx);
      }

      if (
        sub === "/receipts" &&
        method === "POST"
      ) {
        return await receipts.createReceipt(ctx);
      }

      if (
        segments[0] === "receipts" &&
        segments[1] &&
        method === "GET"
      ) {
        return await receipts.getReceipt(
          ctx,
          segments[1]
        );
      }

      // ─────────────────────────────────────────
      // DASHBOARD
      // ─────────────────────────────────────────

      if (
        sub === "/dashboard" &&
        method === "GET"
      ) {
        return await dashboard.getDashboard(ctx);
      }

      // ─────────────────────────────────────────
      // INSIGHTS
      // ─────────────────────────────────────────

      if (
        sub === "/insights/spending-breakdown" &&
        method === "GET"
      ) {
        return await insights.spendingBreakdown(ctx);
      }

      if (
        sub === "/insights/salary-growth" &&
        method === "GET"
      ) {
        return await insights.salaryGrowth(ctx);
      }

      if (
        sub === "/insights/prediction" &&
        method === "GET"
      ) {
        return await insights.prediction(ctx);
      }

      if (
        sub === "/insights/overview" &&
        method === "GET"
      ) {
        return await insights.overview(ctx);
      }

      if (
        sub === "/insights/can-i-afford" &&
        method === "POST"
      ) {
        return await insights.canIAfford(ctx);
      }

      // ─────────────────────────────────────────
      // CALENDAR
      // ─────────────────────────────────────────

      if (
        sub === "/calendar" &&
        method === "GET"
      ) {
        return await calendarRoute.getCalendar(ctx);
      }

      // ─────────────────────────────────────────
      // EXPORT
      // ─────────────────────────────────────────

      if (
        sub === "/export" &&
        method === "GET"
      ) {
        return await exportRoute.exportData(ctx);
      }

      return errorResponse(
        "Not found.",
        404,
        origin
      );
    } catch (err) {
      console.error(err);

      return errorResponse(
        "Something went wrong on our end. Please try again.",
        500,
        origin
      );
    }
  },
};
