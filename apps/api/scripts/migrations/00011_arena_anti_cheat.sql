-- +goose Up
ALTER TABLE arena_match_players
  ADD COLUMN IF NOT EXISTS suspicion_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_suspicion_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_suspicion_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_arena_match_players_suspicion
  ON arena_match_players(match_id, suspicion_count DESC, updated_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_arena_match_players_suspicion;

ALTER TABLE arena_match_players
  DROP COLUMN IF EXISTS last_suspicion_at,
  DROP COLUMN IF EXISTS last_suspicion_reason,
  DROP COLUMN IF EXISTS suspicion_count;
