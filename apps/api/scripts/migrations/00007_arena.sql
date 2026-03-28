-- +goose Up
CREATE TABLE IF NOT EXISTS arena_matches (
  id UUID PRIMARY KEY,
  creator_user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE RESTRICT,
  topic TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  duration_seconds INT NOT NULL DEFAULT 600,
  obfuscate_opponent BOOLEAN NOT NULL DEFAULT TRUE,
  winner_user_id UUID,
  winner_reason TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_match_players (
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('left', 'right')),
  is_creator BOOLEAN NOT NULL DEFAULT FALSE,
  freeze_until TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  best_runtime_ms BIGINT NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id),
  UNIQUE (match_id, side)
);

CREATE TABLE IF NOT EXISTS arena_editor_states (
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS arena_submissions (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  output TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  runtime_ms BIGINT NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  passed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_matches_status_created_at ON arena_matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_matches_task_id ON arena_matches(task_id);
CREATE INDEX IF NOT EXISTS idx_arena_match_players_user_id ON arena_match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_submissions_match_submitted_at ON arena_submissions(match_id, submitted_at DESC);

-- +goose Down
DROP TABLE IF EXISTS arena_submissions;
DROP TABLE IF EXISTS arena_editor_states;
DROP TABLE IF EXISTS arena_match_players;
DROP TABLE IF EXISTS arena_matches;
