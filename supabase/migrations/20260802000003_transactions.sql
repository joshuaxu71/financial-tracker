-- Replace expenses and income_entries with a single transactions table.
-- Signed amounts: negative = expense (category_id set), positive = income (category_id null).

DROP TABLE IF EXISTS income_entries;
DROP TABLE IF EXISTS expenses;

CREATE TABLE transactions (
  id          text PRIMARY KEY,
  date        text NOT NULL,
  source_id   uuid NOT NULL REFERENCES sources (id) ON DELETE RESTRICT,
  amount      double precision NOT NULL,
  category_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
  description text NOT NULL DEFAULT '',
  sort_order  double precision,
  created_at  text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX transactions_user_id_idx ON transactions (user_id);
CREATE INDEX transactions_date_idx ON transactions (date);
CREATE INDEX transactions_source_id_idx ON transactions (source_id);
CREATE INDEX transactions_category_id_idx ON transactions (category_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_own ON transactions
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);
