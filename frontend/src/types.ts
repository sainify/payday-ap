export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  salary_cycle_day: number;
  created_at?: string;
}

export interface UserSettings {
  user_id?: string;
  theme: "light" | "dark" | "system";
  active_mode?: number;
  pin_hash?: string | null;
  pin_enabled?: number;
  split_needs?: number;
  split_savings?: number;
  split_lifestyle?: number;
  split_goals?: number;
  split_emergency?: number;
  notifications_enabled?: number;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  icon: string;
  type: "expense" | "income";
  is_default?: number;
}

export interface Transaction {
  id: string;
  user_id?: string;
  type: "expense" | "income";
  amount: number;
  category_id?: string | null;
  category?: Category | null;
  note?: string | null;
  txn_date: string;
  created_at?: string;
}

export interface Bill {
  id: string;
  user_id?: string;
  title: string;
  amount: number;
  due_date: string;
  recurrence: "one_time" | "monthly" | "weekly" | "yearly";
  status: "pending" | "paid" | "overdue";
  category?: string | null;
  created_at?: string;
}

export interface Goal {
  id: string;
  user_id?: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date?: string | null;
  icon?: string;
  created_at?: string;
}

export interface SalaryEntry {
  id: string;
  user_id?: string;
  amount: number;
  salary_date: string;
  note?: string | null;
  created_at?: string;
}

export type LendingType = "lent" | "borrowed";

export interface LendingEntry {
  id: string;
  user_id?: string;
  type: LendingType;
  person_name: string;
  amount: number;
  settled_amount: number;
  status: "open" | "settled";
  due_date?: string | null;
  note?: string | null;
  created_at?: string;
}

export interface DashboardSummary {
  income?: number;
  expenses?: number;
  balance?: number;
  savings?: number;
  pending_bills?: number;
  upcoming_bills?: Bill[];
  recent_transactions?: Transaction[];
  [key: string]: unknown;
}
