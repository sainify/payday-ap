-- PAYDAY migration 007: link refund income entries to original expenses.
CREATE INDEX IF NOT EXISTS idx_txn_refund_parent ON transactions(user_id, refund_of_id);
