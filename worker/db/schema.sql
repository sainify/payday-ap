-- PAYDAY — D1 schema
-- Run with: wrangler d1 execute payday-db --file=./db/schema.sql

PRAGMA foreign_keys = ON;

-- ── Users & Auth ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  salary_cycle_day INTEGER NOT NULL DEFAULT 24,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                 -- random token, stored in httpOnly cookie
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',         -- light | dark | system
  privacy_mode INTEGER NOT NULL DEFAULT 0,
  pin_hash TEXT,
  pin_enabled INTEGER NOT NULL DEFAULT 0,
  split_needs INTEGER NOT NULL DEFAULT 50,
  split_savings INTEGER NOT NULL DEFAULT 20,
  split_lifestyle INTEGER NOT NULL DEFAULT 20,
  split_goals INTEGER NOT NULL DEFAULT 5,
  split_emergency INTEGER NOT NULL DEFAULT 5,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  expected_salary_date TEXT,
  expected_salary_amount REAL NOT NULL DEFAULT 0,
  opening_balance REAL NOT NULL DEFAULT 0,
  daily_expense_reminder_enabled INTEGER NOT NULL DEFAULT 0,
  daily_expense_reminder_time TEXT NOT NULL DEFAULT '20:00',
  auto_allocate_enabled INTEGER NOT NULL DEFAULT 0
);

-- ── Categories (system defaults have user_id = NULL) ───────────
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💳',
  type TEXT NOT NULL CHECK (type IN ('expense','income')),
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- ── Salary entries ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  salary_date TEXT NOT NULL,
  note TEXT,
  wallet_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_salary_user_date ON salary_entries(user_id, salary_date DESC);

-- ── Transactions (expense / income) ────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense','income')),
  amount REAL NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  note TEXT,
  txn_date TEXT NOT NULL,
  wallet_id TEXT,
  refund_of_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_txn_user_date ON transactions(user_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_txn_refund_parent ON transactions(user_id, refund_of_id);


-- ── Transaction split details ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_splits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_parent ON transaction_splits(user_id, transaction_id);

-- ── Wallets & internal transfers ────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'cash' CHECK (kind IN ('cash','bank','upi','savings','other')),
  opening_balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_salary_wallet_date ON salary_entries(user_id, wallet_id, salary_date DESC);
CREATE TABLE IF NOT EXISTS wallet_transfers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_wallet_id TEXT NOT NULL REFERENCES wallets(id),
  to_wallet_id TEXT NOT NULL REFERENCES wallets(id),
  amount REAL NOT NULL CHECK (amount > 0),
  transfer_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (from_wallet_id <> to_wallet_id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_user_date ON wallet_transfers(user_id, transfer_date DESC);

-- ── User-defined transaction categorization rules ──────────────
CREATE TABLE IF NOT EXISTS transaction_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_text TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense','income')),
  priority INTEGER NOT NULL DEFAULT 100,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_user_type ON transaction_rules(user_id, transaction_type, is_enabled, priority);

-- ── Bills / EMIs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'monthly' CHECK (recurrence IN ('one_time','monthly','weekly','yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bills_user_due ON bills(user_id, due_date);

-- ── Savings goals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount REAL NOT NULL,
  saved_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  icon TEXT NOT NULL DEFAULT '🎯',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- ── Savings entries (contributions, optionally tied to a goal) ─
CREATE TABLE IF NOT EXISTS savings_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  entry_date TEXT NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_savings_user_date ON savings_entries(user_id, entry_date DESC);

-- ── Lending / borrowing tracker ────────────────────────────────
CREATE TABLE IF NOT EXISTS lending_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lent','borrowed')),
  person_name TEXT NOT NULL,
  amount REAL NOT NULL,
  settled_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled')),
  due_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lending_user_status ON lending_entries(user_id, status);

-- ── Default system categories (seeded once, user_id NULL) ─────
INSERT OR IGNORE INTO categories (id, user_id, name, icon, type, is_default) VALUES
  ('cat_food',       NULL, 'Food & Dining',    '🍽️', 'expense', 1),
  ('cat_groceries',  NULL, 'Groceries',        '🛒', 'expense', 1),
  ('cat_transport',  NULL, 'Transport',        '🚕', 'expense', 1),
  ('cat_rent',       NULL, 'Rent & Housing',   '🏠', 'expense', 1),
  ('cat_utilities',  NULL, 'Utilities',        '💡', 'expense', 1),
  ('cat_shopping',   NULL, 'Shopping',         '🛍️', 'expense', 1),
  ('cat_health',     NULL, 'Health',           '💊', 'expense', 1),
  ('cat_entertain',  NULL, 'Entertainment',    '🎬', 'expense', 1),
  ('cat_travel',     NULL, 'Travel',           '✈️', 'expense', 1),
  ('cat_emi',        NULL, 'EMI & Loans',      '🏦', 'expense', 1),
  ('cat_education',  NULL, 'Education',        '📚', 'expense', 1),
  ('cat_other_exp',  NULL, 'Other',            '💳', 'expense', 1),
  ('cat_salary_inc', NULL, 'Salary',           '💼', 'income',  1),
  ('cat_freelance',  NULL, 'Freelance',        '💻', 'income',  1),
  ('cat_gift',       NULL, 'Gift',             '🎁', 'income',  1),
  ('cat_refund',     NULL, 'Refund',           '↩️', 'income',  1),
  ('cat_other_inc',  NULL, 'Other Income',     '💰', 'income',  1);

-- ── Smart finance upgrade ───────────────────────────────────────
-- Category budgets repeat automatically every salary cycle.
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

-- Recurring expenses and subscriptions. These are schedules only;
-- a transaction is created only when the user explicitly logs an occurrence.
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','yearly')),
  next_due_date TEXT NOT NULL,
  is_subscription INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recurring_user_due ON recurring_expenses(user_id, active, next_due_date);

-- One emergency fund per user. Contributions also create savings_entries rows,
-- so existing saved-this-cycle and available-balance logic remains consistent.
CREATE TABLE IF NOT EXISTS emergency_funds (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_amount REAL NOT NULL DEFAULT 0,
  saved_amount REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dedicated debt / EMI tracker. Existing bills remain untouched.
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lender TEXT,
  principal_amount REAL NOT NULL,
  outstanding_amount REAL NOT NULL,
  emi_amount REAL NOT NULL DEFAULT 0,
  interest_rate REAL NOT NULL DEFAULT 0,
  next_due_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status, next_due_date);

-- Reminder preferences are stored separately so current user_settings stays compatible.
CREATE TABLE IF NOT EXISTS reminder_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bills INTEGER NOT NULL DEFAULT 1,
  budgets INTEGER NOT NULL DEFAULT 1,
  subscriptions INTEGER NOT NULL DEFAULT 1,
  debts INTEGER NOT NULL DEFAULT 1,
  days_before INTEGER NOT NULL DEFAULT 2,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- PAYDAY receipt scanner / receipt vault upgrade
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  merchant TEXT,
  receipt_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  tax_amount REAL NOT NULL DEFAULT 0,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  note TEXT,
  source TEXT NOT NULL DEFAULT 'scanner',
  fingerprint TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(user_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_user_fingerprint ON receipts(user_id, fingerprint);

CREATE TABLE IF NOT EXISTS receipt_items (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);
