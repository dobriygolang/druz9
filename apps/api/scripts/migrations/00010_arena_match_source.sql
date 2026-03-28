-- +goose Up
ALTER TABLE arena_matches
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'invite';

CREATE INDEX IF NOT EXISTS idx_arena_matches_source_status_updated_at
  ON arena_matches(source, status, updated_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_arena_matches_source_status_updated_at;
ALTER TABLE arena_matches
  DROP COLUMN IF EXISTS source;
