-- +goose Up
CREATE TABLE IF NOT EXISTS arena_match_queue (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '',
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_player_stats (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 1000,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  best_runtime_ms BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_match_queue_lookup ON arena_match_queue(topic, difficulty, queued_at ASC);
CREATE INDEX IF NOT EXISTS idx_arena_player_stats_rating ON arena_player_stats(rating DESC, wins DESC, best_runtime_ms ASC);

-- +goose Down
DROP TABLE IF EXISTS arena_player_stats;
DROP TABLE IF EXISTS arena_match_queue;
