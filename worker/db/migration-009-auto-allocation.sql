-- PAYDAY migration 009: auto-allocate a percentage of actual salary credits.
ALTER TABLE user_settings ADD COLUMN auto_allocate_enabled INTEGER NOT NULL DEFAULT 0;
