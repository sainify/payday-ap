-- PAYDAY migration 006: user-defined transaction rules.
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
