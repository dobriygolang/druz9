-- +goose Up

-- Extend arena_player_stats with peak rating, win streaks, and season tracking.
ALTER TABLE arena_player_stats
  ADD COLUMN peak_rating INT NOT NULL DEFAULT 300,
  ADD COLUMN current_win_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN best_win_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN season_number SMALLINT NOT NULL DEFAULT 1;

-- Backfill peak_rating from current rating for existing rows.
UPDATE arena_player_stats SET peak_rating = GREATEST(rating, 300);

-- Season results: one row per user per season, written at season end.
CREATE TABLE arena_season_results (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_number SMALLINT NOT NULL,
  final_rating INT NOT NULL,
  final_league TEXT NOT NULL,
  league_rank INT,
  peak_rating INT NOT NULL,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, season_number)
);

CREATE INDEX idx_arena_season_results_season ON arena_season_results(season_number, final_rating DESC);

-- Season metadata: tracks current season number, start/end dates.
CREATE TABLE arena_seasons (
  season_number SMALLINT PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial season (4-week cycle).
INSERT INTO arena_seasons (season_number, starts_at, ends_at, is_active)
VALUES (1, NOW(), NOW() + INTERVAL '28 days', TRUE);

-- +goose Down
DROP TABLE IF EXISTS arena_seasons;
DROP TABLE IF EXISTS arena_season_results;
ALTER TABLE arena_player_stats
  DROP COLUMN IF EXISTS peak_rating,
  DROP COLUMN IF EXISTS current_win_streak,
  DROP COLUMN IF EXISTS best_win_streak,
  DROP COLUMN IF EXISTS season_number;
