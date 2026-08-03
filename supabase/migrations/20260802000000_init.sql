-- PowerSync + Supabase initial schema.
-- All 9 app tables sync. Every table:
--   * has an `id` that PowerSync can use as its row identifier
--     (categories/sources use uuid; expenses/budgets/income/transfers use client-generated text;
--      budget_categories/budget_history get a surrogate text id; exchange_rates keeps currency as its key)
--   * carries a `user_id` column scoped via RLS to the signed-in user (auth.uid())
--
-- Writes from the PowerSync connector run as a privileged Postgres role and are scoped
-- in sync rules via `request.jwt().claims.sub`. RLS below additionally protects the data
-- from any direct client access.

-- ---------------------------------------------------------------- categories
CREATE TABLE categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  name          text NOT NULL,
  display_order integer NOT NULL,
  parent_id     uuid REFERENCES categories (id) ON DELETE CASCADE,
  color         text,
  budget        double precision,
  budget_start  text,
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX categories_user_id_idx ON categories (user_id);
CREATE INDEX categories_parent_id_idx ON categories (parent_id);
CREATE UNIQUE INDEX categories_user_slug_unique ON categories (user_id, slug);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_own ON categories
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- sources
CREATE TABLE sources (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  currency       text NOT NULL,
  color          text,
  opening_balance double precision NOT NULL DEFAULT 0,
  sort_order     integer NOT NULL,
  created_at     text NOT NULL,
  user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX sources_user_id_idx ON sources (user_id);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY sources_own ON sources
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- expenses
CREATE TABLE expenses (
  id          text PRIMARY KEY,
  date        text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  source_id   uuid REFERENCES sources (id) ON DELETE RESTRICT,
  amount      double precision NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at  text NOT NULL,
  sort_order  double precision,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX expenses_user_id_idx ON expenses (user_id);
CREATE INDEX expenses_category_id_idx ON expenses (category_id);
CREATE INDEX expenses_source_id_idx ON expenses (source_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_own ON expenses
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- budgets
CREATE TABLE budgets (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  amount     double precision NOT NULL,
  period     text NOT NULL DEFAULT 'monthly',
  created_at text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX budgets_user_id_idx ON budgets (user_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_own ON budgets
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- budget_categories
CREATE TABLE budget_categories (
  id          text PRIMARY KEY,
  budget_id   text NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX budget_categories_user_id_idx ON budget_categories (user_id);
CREATE INDEX budget_categories_budget_id_idx ON budget_categories (budget_id);
CREATE UNIQUE INDEX budget_categories_unique ON budget_categories (budget_id, category_id);

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_categories_own ON budget_categories
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- budget_history
CREATE TABLE budget_history (
  id         text PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  month      text NOT NULL,
  allocation double precision NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX budget_history_user_id_idx ON budget_history (user_id);
CREATE UNIQUE INDEX budget_history_unique ON budget_history (category_id, month);

ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_history_own ON budget_history
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- income_entries
CREATE TABLE income_entries (
  id         text PRIMARY KEY,
  source_id  uuid NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  amount     double precision NOT NULL,
  date       text NOT NULL,
  created_at text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX income_entries_user_id_idx ON income_entries (user_id);
CREATE INDEX income_entries_source_id_idx ON income_entries (source_id);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY income_entries_own ON income_entries
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- exchange_rates
-- PowerSync rows always carry an `id` column, so it gets a surrogate text PK
-- while `currency` stays a unique business key.
CREATE TABLE exchange_rates (
  id         text PRIMARY KEY,
  currency   text NOT NULL UNIQUE,
  rate       double precision NOT NULL,
  updated_at text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX exchange_rates_user_id_idx ON exchange_rates (user_id);
CREATE INDEX exchange_rates_currency_idx ON exchange_rates (currency);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY exchange_rates_own ON exchange_rates
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- transfers
CREATE TABLE transfers (
  id            text PRIMARY KEY,
  from_source_id uuid NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  to_source_id   uuid NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  from_amount    double precision NOT NULL,
  to_amount      double precision NOT NULL,
  exchange_rate  double precision NOT NULL DEFAULT 1,
  date           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  created_at     text NOT NULL,
  user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX transfers_user_id_idx ON transfers (user_id);
CREATE INDEX transfers_from_source_id_idx ON transfers (from_source_id);
CREATE INDEX transfers_to_source_id_idx ON transfers (to_source_id);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY transfers_own ON transfers
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- publication
-- PowerSync's replication captures changes from this publication. Must exist
-- before the PowerSync connector starts (its "Publication" config = powersync).
-- Note: CREATE PUBLICATION cannot run inside a transaction block, so this stays
-- a top-level statement.
CREATE PUBLICATION powersync FOR ALL TABLES;
