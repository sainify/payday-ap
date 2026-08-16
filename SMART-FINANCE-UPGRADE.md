# PAYDAY Smart Finance Upgrade

This upgrade extends the existing PAYDAY app without replacing the current authentication, salary-cycle logic, Safe to Spend Today, Salary Splitter, Can I Afford It, Goals, Lending, privacy/PIN, PWA manifest, or bottom navigation.

## Added

- Category budgets per salary cycle with 80%/100% warnings
- Recent transactions on Home
- Smart spending alerts and cycle-end cash-flow forecast
- Recurring expenses and subscription tracking
- Emergency fund target + contributions
- Improved goals with quick contributions, remaining amount and target-date progress
- Dedicated debt / EMI manager with payment logging
- Richer Insights with previous-cycle comparison, savings rate, budget health and subscription run-rate
- Enhanced financial calendar with transactions, recurring items, subscriptions and debt due dates
- Reminder Center and browser notification permission bridge
- Expanded Quick Add menu
- Advanced transaction search and filters
- CSV and JSON export
- User-scoped offline cache/queue protection so cached financial data is not shared between accounts on the same device
- GitHub Actions verification workflow for frontend build and Worker typecheck

## Existing data safety

The migration only creates new tables and indexes. It does not drop or alter existing PAYDAY tables. Existing users, sessions, transactions, salary entries, bills, goals, savings, lending and settings remain untouched.

## D1 migration

Run `worker/db/migration-002-smart-finance.sql` on the existing `payday-db` before deploying the upgraded Worker.

## Deployment order

1. Run the D1 migration.
2. Deploy the Worker.
3. Deploy the frontend/Pages build.
4. Test one account first, then test a second account for data isolation.

## Verification

A GitHub Actions workflow is included at `.github/workflows/verify.yml`. Do not merge the feature branch into `main` until both **Frontend build** and **Worker typecheck** are green.
