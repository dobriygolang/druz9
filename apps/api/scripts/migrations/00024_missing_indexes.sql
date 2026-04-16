-- +goose Up
-- +goose NO TRANSACTION

-- circle_members is frequently joined by circle_id in pulse and digest queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_circle_members_circle
  ON circle_members(circle_id);

-- interview_mock_sessions: pulse queries filter by (user_id, status, finished_at)
-- Already have idx_interview_mock_sessions_user_status from migration 00015.
-- But pulse also filters by finished_at directly for non-user queries:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_mock_sessions_finished
  ON interview_mock_sessions(status, finished_at DESC)
  WHERE status = 'finished';

-- interview_practice_sessions: same pattern for pulse
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_practice_sessions_finished
  ON interview_practice_sessions(status, finished_at DESC)
  WHERE status = 'finished';

-- arena_matches: pulse joins on status=3 and finished_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arena_matches_finished
  ON arena_matches(status, finished_at DESC)
  WHERE status = 3;

-- +goose Down
DROP INDEX CONCURRENTLY IF EXISTS idx_circle_members_circle;
DROP INDEX CONCURRENTLY IF EXISTS idx_interview_mock_sessions_finished;
DROP INDEX CONCURRENTLY IF EXISTS idx_interview_practice_sessions_finished;
DROP INDEX CONCURRENTLY IF EXISTS idx_arena_matches_finished;
