-- +goose Up
-- Arena (ranked duels) + duel replays.
-- Consolidated from original migrations 00003 (arena_* parts), 00021, 00030, 00038 (duel_replay_events CHECK).

CREATE TABLE IF NOT EXISTS arena_matches (
  id UUID PRIMARY KEY,
  creator_user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE RESTRICT,
  topic TEXT NOT NULL DEFAULT '' CHECK (octet_length(topic) <= 64),
  difficulty INT NOT NULL DEFAULT 0 CHECK (difficulty BETWEEN 0 AND 3),
  source INT NOT NULL DEFAULT 1 CHECK (source BETWEEN 0 AND 2),
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  duration_seconds SMALLINT NOT NULL DEFAULT 600,
  obfuscate_opponent BOOLEAN NOT NULL DEFAULT TRUE,
  winner_user_id UUID,
  winner_reason INT NOT NULL DEFAULT 0 CHECK (winner_reason BETWEEN 0 AND 7),
  is_rated BOOLEAN NOT NULL DEFAULT TRUE,
  unrated_reason TEXT NOT NULL DEFAULT '',
  anti_cheat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_matches_status_updated_at ON arena_matches(status, updated_at DESC);
CREATE INDEX idx_arena_matches_task_id ON arena_matches(task_id);
CREATE INDEX idx_arena_matches_source_status_updated_at ON arena_matches(source, status, updated_at DESC);
CREATE INDEX idx_arena_matches_rated_status ON arena_matches(is_rated, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS arena_match_players (
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL CHECK (octet_length(display_name) BETWEEN 1 AND 80),
  side INT NOT NULL CHECK (side BETWEEN 0 AND 2),
  is_creator BOOLEAN NOT NULL DEFAULT FALSE,
  freeze_until TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  best_runtime_ms INTEGER NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  suspicion_count INT NOT NULL DEFAULT 0,
  last_suspicion_reason TEXT NOT NULL DEFAULT '',
  last_suspicion_at TIMESTAMPTZ,
  anti_cheat_penalized BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id),
  UNIQUE (match_id, side)
);

CREATE INDEX idx_arena_match_players_user_id ON arena_match_players(user_id);
CREATE INDEX idx_arena_match_players_suspicion ON arena_match_players(match_id, suspicion_count DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS arena_submissions (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  output TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  runtime_ms INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  passed_count SMALLINT NOT NULL DEFAULT 0,
  total_count SMALLINT NOT NULL DEFAULT 0,
  failed_test_index INT NOT NULL DEFAULT 0,
  failure_kind INT NOT NULL DEFAULT 0 CHECK (failure_kind BETWEEN 0 AND 4),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_submissions_match_submitted_at ON arena_submissions(match_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS arena_player_stats (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 300,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  best_runtime_ms BIGINT NOT NULL DEFAULT 0,
  peak_rating INT NOT NULL DEFAULT 300,
  current_win_streak INT NOT NULL DEFAULT 0,
  best_win_streak INT NOT NULL DEFAULT 0,
  season_number SMALLINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_player_stats_rating ON arena_player_stats(rating DESC, wins DESC, best_runtime_ms ASC);

CREATE TABLE IF NOT EXISTS arena_editor_states (
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS arena_rating_penalties (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  delta_rating INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_rating_penalties_user_id ON arena_rating_penalties(user_id);
CREATE INDEX idx_arena_rating_penalties_match_user ON arena_rating_penalties(match_id, user_id);
CREATE UNIQUE INDEX uq_arena_rating_penalties_match_user_reason
  ON arena_rating_penalties(match_id, user_id, reason);

CREATE TABLE IF NOT EXISTS arena_match_queue (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  difficulty INT NOT NULL DEFAULT 0 CHECK (difficulty BETWEEN 0 AND 3),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_match_queue_lookup ON arena_match_queue(topic, difficulty, queued_at ASC);

-- Arena seasons.
CREATE TABLE IF NOT EXISTS arena_seasons (
  season_number SMALLINT PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the initial 4-week season.
INSERT INTO arena_seasons (season_number, starts_at, ends_at, is_active)
VALUES (1, NOW(), NOW() + INTERVAL '28 days', TRUE)
ON CONFLICT (season_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS arena_season_results (
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

-- Duel replays.
CREATE TABLE IF NOT EXISTS duel_replays (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind      SMALLINT     NOT NULL,
  source_id        UUID         NOT NULL,
  player1_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player1_username TEXT         NOT NULL,
  player2_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_username TEXT         NOT NULL,
  task_title       TEXT         NOT NULL,
  task_topic       TEXT         NOT NULL DEFAULT '',
  task_difficulty  SMALLINT     NOT NULL DEFAULT 0,
  duration_ms      INT          NOT NULL DEFAULT 0,
  winner_id        UUID         REFERENCES users(id) ON DELETE SET NULL,
  completed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT duel_replays_source_unique UNIQUE (source_kind, source_id),
  CONSTRAINT duel_replays_distinct_players CHECK (player1_id <> player2_id)
);

CREATE INDEX idx_duel_replays_player1 ON duel_replays(player1_id, completed_at DESC);
CREATE INDEX idx_duel_replays_player2 ON duel_replays(player2_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS duel_replay_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_id   UUID         NOT NULL REFERENCES duel_replays(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL,
  t_ms        INT          NOT NULL,
  kind        SMALLINT     NOT NULL,
  label       TEXT         NOT NULL DEFAULT '',
  lines_count INT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT duel_replay_events_t_nonneg CHECK (t_ms >= 0),
  CONSTRAINT duel_replay_events_label_len CHECK (char_length(label) <= 200)
);

CREATE INDEX idx_duel_events_replay_t ON duel_replay_events(replay_id, t_ms);

-- +goose Down
DROP TABLE IF EXISTS duel_replay_events;
DROP TABLE IF EXISTS duel_replays;
DROP TABLE IF EXISTS arena_season_results;
DROP TABLE IF EXISTS arena_seasons;
DROP TABLE IF EXISTS arena_match_queue;
DROP TABLE IF EXISTS arena_rating_penalties;
DROP TABLE IF EXISTS arena_editor_states;
DROP TABLE IF EXISTS arena_player_stats;
DROP TABLE IF EXISTS arena_submissions;
DROP TABLE IF EXISTS arena_match_players;
DROP TABLE IF EXISTS arena_matches;
