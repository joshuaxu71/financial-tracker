-- User preferences table. One row per user.

CREATE TABLE user_preference (
  id          text PRIMARY KEY,
  base_currency text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

ALTER TABLE user_preference ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preference_own ON user_preference
  FOR ALL USING (auth.uid () = user_id) WITH CHECK (auth.uid () = user_id);
