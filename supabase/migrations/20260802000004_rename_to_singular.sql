-- Rename all tables from plural to singular.
-- Postgres automatically updates FK constraints to point at the new name.

ALTER TABLE categories RENAME TO category;
ALTER TABLE sources RENAME TO source;
ALTER TABLE exchange_rates RENAME TO exchange_rate;
ALTER TABLE transfers RENAME TO transfer;
ALTER TABLE budget_movements RENAME TO budget_movement;
ALTER TABLE transactions RENAME TO transaction;

-- Drop dead tables (budgets, budget_categories, budget_history — no feature code uses them)
DROP TABLE IF EXISTS budget_history;
DROP TABLE IF EXISTS budget_categories;
DROP TABLE IF EXISTS budgets;
