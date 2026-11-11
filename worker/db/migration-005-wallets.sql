-- PAYDAY migration 005: multi-wallet accounts and internal transfers.
-- The deployment workflow adds transactions.wallet_id idempotently before applying this file.
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
CREATE INDEX IF NOT EXISTS idx_txn_wallet_date ON transactions(user_id, wallet_id, txn_date DESC);
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
INSERT INTO wallets (id, user_id, name, kind, opening_balance, currency)
SELECT 'wallet_default_' || u.id, u.id, 'Main wallet', 'bank', 0, u.currency
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = u.id);
UPDATE salary_entries SET wallet_id = 'wallet_default_' || user_id WHERE wallet_id IS NULL;
UPDATE transactions SET wallet_id = 'wallet_default_' || user_id WHERE wallet_id IS NULL;
UPDATE wallets SET opening_balance = COALESCE((SELECT opening_balance FROM user_settings WHERE user_settings.user_id=wallets.user_id),0) WHERE id = 'wallet_default_' || user_id;
