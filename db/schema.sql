-- One row per signed-in player. Apply by hand; there is no migration runner.
CREATE TABLE IF NOT EXISTS game_saves (
  user_id text PRIMARY KEY,
  email text,
  save jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
