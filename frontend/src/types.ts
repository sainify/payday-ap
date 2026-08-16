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
  privacy_mode?: number;
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
  category_name?: string | null;
  category_icon?: string | null;
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

export interface Budget {
  id: string;
  category_id: string;
  category_name: string;
  category_icon?: string;
  limit_amount: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  next_due_date: string;
  is_subscription: number;
  active: number;
  note?: string | null;
  created_at?: string;
}

export interface EmergencyFund {
  user_id: string;
  target_amount: number;
  saved_amount: number;
  percent: number;
  updated_at?: string;
}

export interface Debt {
  id: string;
  title: string;
  lender?: string | null;
  principal_amount: number;
  outstanding_amount: number;
  emi_amount: number;
  interest_rate: number;
  next_due_date?: string | null;
  status: "active" | "paid";
  note?: string | null;
  created_at?: string;
}

export interface ReminderPreference {
  bills: number;
  budgets: number;
  subscriptions: number;
  debts: number;
  days_before: number;
}

export interface ReminderItem {
  id: string;
  type: string;
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  date?: string;
}

export interface SmartAlert {
  type: string;
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
}

export interface Forecast {
  predictedEndBalance: number;
  rawPredictedEndBalance: number;
  avgDailySpend: number;
  knownFutureCommitments: number;
}

export interface SalaryCycle {
  start: string;
  end: string;
  cycleDay: number;
  totalDays: number;
  daysRemaining: number;
}

export interface DashboardSummary {
  cycle?: SalaryCycle | null;
  currentSalary?: number;
  availableBalance?: number;
  safeToSpendToday?: number;
  spentThisCycle?: number;
  savedThisCycle?: number;
  income?: number;
  expenses?: number;
  balance?: number;
  savings?: number;
  pending_bills?: number;
  upcomingBills?: Bill[];
  upcoming_bills?: Bill[];
  recentTransactions?: Transaction[];
  recent_transactions?: Transaction[];
  smartAlerts?: SmartAlert[];
  forecast?: Forecast;
}
