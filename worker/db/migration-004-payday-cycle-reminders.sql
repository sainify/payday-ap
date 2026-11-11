-- PAYDAY salary-cycle and reminder preferences (additive only).
ALTER TABLE user_settings ADD COLUMN expected_salary_date TEXT;
ALTER TABLE user_settings ADD COLUMN daily_expense_reminder_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN daily_expense_reminder_time TEXT NOT NULL DEFAULT '20:00';
ALTER TABLE user_settings ADD COLUMN expected_salary_amount REAL NOT NULL DEFAULT 0;
