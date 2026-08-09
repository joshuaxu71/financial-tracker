-- Replace budget_snapshots with budget_movements.
-- budget_movements stores all balance changes for a category:
--   * monthly allocation credits (inserted on the 1st of each month by the app)
--   * manual balance adjustments (delta when the user sets a specific balance)

DROP TABLE IF EXISTS budget_snapshots;

CREATE TABLE budget_movements (
  id          TEXT PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  amount      double precision NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX budget_movements_category_id_idx ON budget_movements (category_id);
CREATE INDEX budget_movements_date_idx ON budget_movements (date);

ALTER TABLE budget_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_movements_own ON budget_movements
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);
