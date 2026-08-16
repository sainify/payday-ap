import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cacheGet, cacheSet, queueMutation } from "@/lib/storage";
import {
  DashboardSummary,
  Transaction,
  Bill,
  Goal,
  LendingEntry,
  Category,
  SalaryEntry,
  UserSettings,
  Budget,
  RecurringExpense,
  EmergencyFund,
  Debt,
  ReminderItem,
  ReminderPreference,
  SalaryCycle,
} from "@/types";

function useResource<T>(key: string, path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(() => cacheGet<T>(key));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path);
      setData(res);
      cacheSet(key, res);
    } catch (e) {
      const cached = cacheGet<T>(key);
      if (cached) setData(cached);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: load };
}

export function useDashboard() {
  return useResource<DashboardSummary>("dashboard", "/dashboard");
}

export interface TransactionFilters {
  q?: string;
  type?: string;
  category?: string;
  from?: string;
  to?: string;
  min?: string;
  max?: string;
}

export function useTransactions(params?: TransactionFilters) {
  const clean = params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")) : {};
  const qs = Object.keys(clean).length ? "?" + new URLSearchParams(clean as Record<string, string>).toString() : "";
  return useResource<Transaction[]>(`transactions${qs}`, `/transactions${qs}`, [qs]);
}

export function useBills() {
  return useResource<Bill[]>("bills", "/bills");
}

export function useGoals() {
  return useResource<Goal[]>("goals", "/goals");
}

export function useLending() {
  return useResource<LendingEntry[]>("lending", "/lending");
}

export function useCategories(type?: "expense" | "income") {
  const qs = type ? `?type=${type}` : "";
  return useResource<Category[]>(`categories${qs}`, `/categories${qs}`, [qs]);
}

export function useSalaryHistory() {
  return useResource<SalaryEntry[]>("salary-history", "/salary");
}

export function useBudgets() {
  return useResource<{ cycle: SalaryCycle; items: Budget[] }>("budgets", "/budgets");
}

export function useRecurring(kind?: "subscription" | "expense") {
  const qs = kind ? `?kind=${kind}` : "";
  return useResource<RecurringExpense[]>(`recurring${qs}`, `/recurring${qs}`, [qs]);
}

export function useEmergencyFund() {
  return useResource<EmergencyFund>("emergency-fund", "/emergency-fund");
}

export function useDebts() {
  return useResource<Debt[]>("debts", "/debts");
}

export function useReminderCenter() {
  return useResource<{ preferences: ReminderPreference; reminders: ReminderItem[] }>("reminders", "/notifications");
}

/** Fire-and-forget mutation helper with offline queueing. */
export async function mutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T | null> {
  if (!navigator.onLine) {
    queueMutation({ path, method, body });
    return null;
  }
  try {
    if (method === "POST") return await api.post<T>(path, body);
    if (method === "PATCH") return await api.patch<T>(path, body);
    return await api.del<T>(path);
  } catch (e) {
    queueMutation({ path, method, body });
    throw e;
  }
}

export type { UserSettings };
