-- One row per signed-in player. Apply by hand; there is no migration runner.
CREATE TABLE IF NOT EXISTS game_saves (
  user_id text PRIMARY KEY,
  email text,
  save jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Emails of people who ticked "keep my email" while deleting their account. Created on first use.
CREATE TABLE IF NOT EXISTS mailing_list (
  email text PRIMARY KEY,
  consented_at timestamptz NOT NULL DEFAULT now()
);
