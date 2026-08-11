-- Fresh consolidated schema for a reset Supabase project.
-- Run this once in the Supabase SQL editor after resetting the database.
-- Final state of all 7 synced tables, matching src/powersync/AppSchema.ts.

-- ---------------------------------------------------------------- category
CREATE TABLE category (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  display_order integer NOT NULL,
  parent_id     uuid REFERENCES category (id) ON DELETE CASCADE,
  color         text,
  budget        double precision,
  budget_start  text,
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX category_user_id_idx ON category (user_id);
CREATE INDEX category_parent_id_idx ON category (parent_id);

ALTER TABLE category ENABLE ROW LEVEL SECURITY;

CREATE POLICY category_own ON category
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- source
CREATE TABLE source (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  currency   text NOT NULL,
  color      text,
  sort_order integer NOT NULL,
  created_at text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX source_user_id_idx ON source (user_id);

ALTER TABLE source ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_own ON source
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- transaction
CREATE TABLE transaction (
  id          text PRIMARY KEY,
  date        text NOT NULL,
  source_id   uuid NOT NULL REFERENCES source (id) ON DELETE RESTRICT,
  amount      double precision NOT NULL,
  category_id uuid REFERENCES category (id) ON DELETE RESTRICT,
  description text NOT NULL DEFAULT '',
  sort_order  double precision,
  created_at  text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX transaction_user_id_idx ON transaction (user_id);
CREATE INDEX transaction_date_idx ON transaction (date);
CREATE INDEX transaction_source_id_idx ON transaction (source_id);
CREATE INDEX transaction_category_id_idx ON transaction (category_id);

ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_own ON transaction
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- budget_movement
CREATE TABLE budget_movement (
  id          text PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  date        text NOT NULL,
  amount      double precision NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX budget_movement_category_id_idx ON budget_movement (category_id);
CREATE INDEX budget_movement_date_idx ON budget_movement (date);

ALTER TABLE budget_movement ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_movement_own ON budget_movement
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- exchange_rate
CREATE TABLE exchange_rate (
  id         text PRIMARY KEY,
  currency   text NOT NULL UNIQUE,
  rate       double precision NOT NULL,
  updated_at text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX exchange_rate_user_id_idx ON exchange_rate (user_id);
CREATE INDEX exchange_rate_currency_idx ON exchange_rate (currency);

ALTER TABLE exchange_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY exchange_rate_own ON exchange_rate
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- transfer
CREATE TABLE transfer (
  id             text PRIMARY KEY,
  from_source_id uuid NOT NULL REFERENCES source (id) ON DELETE CASCADE,
  to_source_id   uuid NOT NULL REFERENCES source (id) ON DELETE CASCADE,
  from_amount    double precision NOT NULL,
  to_amount      double precision NOT NULL,
  exchange_rate  double precision NOT NULL DEFAULT 1,
  date           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  created_at     text NOT NULL,
  user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX transfer_user_id_idx ON transfer (user_id);
CREATE INDEX transfer_from_source_id_idx ON transfer (from_source_id);
CREATE INDEX transfer_to_source_id_idx ON transfer (to_source_id);

ALTER TABLE transfer ENABLE ROW LEVEL SECURITY;

CREATE POLICY transfer_own ON transfer
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- user_preference
CREATE TABLE user_preference (
  id            text PRIMARY KEY,
  base_currency text NOT NULL,
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

ALTER TABLE user_preference ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preference_own ON user_preference
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------- publication
-- PowerSync's replication captures changes from this publication. Must exist
-- before the PowerSync connector starts (its "Publication" config = powersync).
CREATE PUBLICATION powersync FOR ALL TABLES;
