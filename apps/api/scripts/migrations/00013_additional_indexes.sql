-- +goose Up
-- +goose NO TRANSACTION

-- code_submissions: user submission history sorted by time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_code_submissions_user_submitted
  ON code_submissions(user_id, submitted_at DESC) WHERE user_id IS NOT NULL;

-- arena_matches: match listing by creator and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arena_matches_creator_status
  ON arena_matches(creator_user_id, status);

-- +goose Down
DROP INDEX IF EXISTS idx_arena_matches_creator_status;
DROP INDEX IF EXISTS idx_code_submissions_user_submitted;
