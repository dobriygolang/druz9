-- +goose Up
ALTER TABLE arena_matches
  ADD COLUMN IF NOT EXISTS is_rated BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS unrated_reason TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_arena_matches_rated_status
  ON arena_matches(is_rated, status, updated_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_arena_matches_rated_status;

ALTER TABLE arena_matches
  DROP COLUMN IF EXISTS unrated_reason,
  DROP COLUMN IF EXISTS is_rated;
