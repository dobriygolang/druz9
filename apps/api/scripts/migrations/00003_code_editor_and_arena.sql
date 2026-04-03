-- +goose Up
CREATE TABLE code_tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL CHECK (octet_length(title) BETWEEN 1 AND 160),
  slug TEXT NOT NULL UNIQUE CHECK (octet_length(slug) BETWEEN 1 AND 80),
  statement TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 0 AND 3),
  topics TEXT[] NOT NULL DEFAULT '{}',
  starter_code TEXT NOT NULL,
  language INT NOT NULL DEFAULT 4 CHECK (language BETWEEN 0 AND 8),
  task_type INT NOT NULL DEFAULT 1 CHECK (task_type BETWEEN 0 AND 3),
  execution_profile TEXT NOT NULL DEFAULT 'pure'
    CHECK (execution_profile IN ('pure', 'file_io', 'http_client', 'interview_realistic')),
  runner_mode INT NOT NULL DEFAULT 1,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  fixture_files TEXT[] NOT NULL DEFAULT '{}',
  readable_paths TEXT[] NOT NULL DEFAULT '{}',
  writable_paths TEXT[] NOT NULL DEFAULT '{}',
  allowed_hosts TEXT[] NOT NULL DEFAULT '{}',
  allowed_ports INT[] NOT NULL DEFAULT '{}',
  mock_endpoints TEXT[] NOT NULL DEFAULT '{}',
  writable_temp_dir BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_tasks_active ON code_tasks(is_active);
CREATE INDEX idx_code_tasks_topics ON code_tasks USING GIN(topics);

CREATE TABLE code_task_test_cases (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  weight SMALLINT NOT NULL DEFAULT 1,
  "order" SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_code_task_test_cases_task_id ON code_task_test_cases(task_id);

CREATE TABLE code_rooms (
  id UUID PRIMARY KEY,
  mode INT NOT NULL DEFAULT 1 CHECK (mode BETWEEN 0 AND 2),
  code TEXT NOT NULL,
  code_revision INTEGER NOT NULL DEFAULT 0,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  creator_id UUID,
  invite_code TEXT NOT NULL UNIQUE CHECK (octet_length(invite_code) BETWEEN 6 AND 32),
  task_id UUID,
  duel_topic TEXT CHECK (octet_length(COALESCE(duel_topic, '')) <= 64),
  winner_user_id UUID,
  winner_guest_name TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_rooms_status_updated_at ON code_rooms(status, updated_at DESC);

CREATE TABLE code_participants (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL CHECK (octet_length(name) BETWEEN 1 AND 80),
  is_guest BOOLEAN NOT NULL DEFAULT TRUE,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_code_participants_room_id ON code_participants(room_id);
CREATE INDEX idx_code_participants_user_id ON code_participants(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_code_participants_guest_name
  ON code_participants(room_id, name) WHERE is_guest = TRUE;

CREATE TABLE code_submissions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  guest_name TEXT CHECK (octet_length(COALESCE(guest_name, '')) <= 80),
  output TEXT,
  error TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  passed_count SMALLINT NOT NULL DEFAULT 0,
  total_count SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_code_submissions_room_submitted_at ON code_submissions(room_id, submitted_at DESC);
CREATE INDEX idx_code_submissions_user_id ON code_submissions(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE arena_matches (
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

CREATE TABLE arena_match_players (
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

CREATE TABLE arena_editor_states (
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE arena_submissions (
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

CREATE TABLE arena_match_queue (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  difficulty INT NOT NULL DEFAULT 0 CHECK (difficulty BETWEEN 0 AND 3),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_match_queue_lookup ON arena_match_queue(topic, difficulty, queued_at ASC);

CREATE TABLE arena_player_stats (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 300,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  best_runtime_ms BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_player_stats_rating ON arena_player_stats(rating DESC, wins DESC, best_runtime_ms ASC);

CREATE TABLE arena_rating_penalties (
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

-- +goose Down
DROP INDEX IF EXISTS uq_arena_rating_penalties_match_user_reason;
DROP INDEX IF EXISTS idx_arena_rating_penalties_match_user;
DROP INDEX IF EXISTS idx_arena_rating_penalties_user_id;
DROP TABLE IF EXISTS arena_rating_penalties;
DROP TABLE IF EXISTS arena_player_stats;
DROP TABLE IF EXISTS arena_match_queue;
DROP TABLE IF EXISTS arena_submissions;
DROP TABLE IF EXISTS arena_editor_states;
DROP TABLE IF EXISTS arena_match_players;
DROP TABLE IF EXISTS arena_matches;
DROP TABLE IF EXISTS code_submissions;
DROP TABLE IF EXISTS code_participants;
DROP TABLE IF EXISTS code_rooms;
DROP TABLE IF EXISTS code_task_test_cases;
DROP TABLE IF EXISTS code_tasks;
