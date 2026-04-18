-- +goose Up
-- +goose StatementBegin

-- Add users.activity_status (presence enum: 0=unspecified, 1=online, 2=recently_active, 3=offline).
-- Code paths in data/social/repo.go and data/arena/*.go already read this
-- column (COALESCE(u.activity_status, 0)) but it was never materialised,
-- which surfaced as 500s on /social/friends and /arena/leaderboard/*.
-- Default 0 means "derive from last_active_at" per mapPresence() logic.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS activity_status SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_activity_status ON users(activity_status) WHERE activity_status <> 0;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_activity_status;
ALTER TABLE users DROP COLUMN IF EXISTS activity_status;
-- +goose StatementEnd
