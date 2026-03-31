-- +goose Up
-- +goose StatementBegin
ALTER TABLE arena_match_players
ADD COLUMN IF NOT EXISTS anti_cheat_penalized BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS arena_rating_penalties (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  delta_rating INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_rating_penalties_user_id
  ON arena_rating_penalties(user_id);

CREATE INDEX IF NOT EXISTS idx_arena_rating_penalties_match_user
  ON arena_rating_penalties(match_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_arena_rating_penalties_match_user_reason
  ON arena_rating_penalties(match_id, user_id, reason);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS uq_arena_rating_penalties_match_user_reason;
DROP INDEX IF EXISTS idx_arena_rating_penalties_match_user;
DROP INDEX IF EXISTS idx_arena_rating_penalties_user_id;
DROP TABLE IF EXISTS arena_rating_penalties;
ALTER TABLE arena_match_players DROP COLUMN IF EXISTS anti_cheat_penalized;
-- +goose StatementEnd