-- User settings table. One row per user.

CREATE TABLE settings (
  id          text PRIMARY KEY,
  base_currency text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_own ON settings
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);
