-- +goose Up
-- +goose NO TRANSACTION
--
-- Hot-path performance indexes that must be created CONCURRENTLY so a
-- production rollout doesn't lock the table against writes. Consolidated
-- from original migrations 00013, 00024, and 00039.
--
-- All max-length CHECK constraints from migration 00038 (validation
-- hardening) are already inlined into the CREATE TABLE statements in
-- files 00001..00006, so this file is index-only.

-- 00013: code_submissions user history + arena_matches creator listing.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_code_submissions_user_submitted
  ON code_submissions(user_id, submitted_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arena_matches_creator_status
  ON arena_matches(creator_user_id, status);

-- 00024: pulse/digest hot paths.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_mock_sessions_finished
  ON interview_mock_sessions(status, finished_at DESC)
  WHERE status = 'finished';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_practice_sessions_finished
  ON interview_practice_sessions(status, finished_at DESC)
  WHERE status = 'finished';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arena_matches_finished
  ON arena_matches(status, finished_at DESC)
  WHERE status = 3;

-- 00039: season XP leaderboard, guild wins, world-map pins, equipped inventory.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uspp_season_xp
  ON user_season_pass_progress (season_pass_id, xp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arena_matches_winner_finished
  ON arena_matches (winner_user_id, finished_at DESC)
  WHERE winner_user_id IS NOT NULL AND status = 3;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_geo_scheduled
  ON events (scheduled_at DESC)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    AND latitude <> 0 AND longitude <> 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_inventory_user_equipped
  ON user_shop_inventory (user_id)
  WHERE equipped = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_user_inventory_user_equipped;
DROP INDEX IF EXISTS idx_events_geo_scheduled;
DROP INDEX IF EXISTS idx_arena_matches_winner_finished;
DROP INDEX IF EXISTS idx_uspp_season_xp;
DROP INDEX IF EXISTS idx_arena_matches_finished;
DROP INDEX IF EXISTS idx_interview_practice_sessions_finished;
DROP INDEX IF EXISTS idx_interview_mock_sessions_finished;
DROP INDEX IF EXISTS idx_arena_matches_creator_status;
DROP INDEX IF EXISTS idx_code_submissions_user_submitted;
