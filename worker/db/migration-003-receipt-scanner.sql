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
