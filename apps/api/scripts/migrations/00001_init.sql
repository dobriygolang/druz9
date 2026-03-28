-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_workplace TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

CREATE TABLE IF NOT EXISTS geo (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  country TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS geo_region_idx ON geo(region);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  place_label TEXT NOT NULL,
  description TEXT,
  meeting_link TEXT,
  region TEXT,
  country TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_scheduled_at ON events(scheduled_at);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_created_at ON event_participants(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_status ON event_participants(event_id, status);

CREATE TABLE IF NOT EXISTS podcasts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  listens_count BIGINT NOT NULL DEFAULT 0,
  file_name TEXT,
  content_type INT NOT NULL DEFAULT 0 CHECK (content_type BETWEEN 0 AND 4),
  object_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  vacancy_url TEXT,
  description TEXT NOT NULL,
  experience TEXT,
  location TEXT,
  employment_type INT NOT NULL DEFAULT 0 CHECK (employment_type BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

CREATE TABLE IF NOT EXISTS code_tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL CHECK (octet_length(title) BETWEEN 1 AND 160),
  slug TEXT NOT NULL UNIQUE CHECK (octet_length(slug) BETWEEN 1 AND 80),
  statement TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 0 AND 3),
  topics TEXT[] NOT NULL DEFAULT '{}',
  starter_code TEXT NOT NULL,
  language INT NOT NULL DEFAULT 4 CHECK (language BETWEEN 0 AND 7),
  task_type INT NOT NULL DEFAULT 1 CHECK (task_type BETWEEN 0 AND 3),
  execution_profile TEXT NOT NULL DEFAULT 'pure'
    CHECK (execution_profile IN ('pure', 'file_io', 'http_client', 'interview_realistic')),
  runner_mode INT NOT NULL DEFAULT 1,
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

CREATE INDEX IF NOT EXISTS idx_code_tasks_active ON code_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_code_tasks_topics ON code_tasks USING GIN(topics);

CREATE TABLE IF NOT EXISTS code_task_test_cases (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  weight SMALLINT NOT NULL DEFAULT 1,
  "order" SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_code_task_test_cases_task_id ON code_task_test_cases(task_id);

CREATE TABLE IF NOT EXISTS code_rooms (
  id UUID PRIMARY KEY,
  mode INT NOT NULL DEFAULT 1 CHECK (mode BETWEEN 0 AND 2),
  code TEXT NOT NULL,
  code_revision INTEGER NOT NULL DEFAULT 0,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  creator_id UUID,
  invite_code TEXT NOT NULL UNIQUE CHECK (octet_length(invite_code) BETWEEN 6 AND 32),
  task TEXT,
  task_id UUID,
  duel_topic TEXT CHECK (octet_length(COALESCE(duel_topic, '')) <= 64),
  winner_user_id UUID,
  winner_guest_name TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_rooms_status_updated_at ON code_rooms(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS code_participants (
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

CREATE INDEX IF NOT EXISTS idx_code_participants_room_id ON code_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_code_participants_user_id ON code_participants(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_code_participants_guest_name
  ON code_participants(room_id, name) WHERE is_guest = TRUE;

CREATE TABLE IF NOT EXISTS code_submissions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  guest_name TEXT CHECK (octet_length(COALESCE(guest_name, '')) <= 80),
  code TEXT NOT NULL,
  output TEXT,
  error TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  passed_count SMALLINT NOT NULL DEFAULT 0,
  total_count SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_code_submissions_room_submitted_at ON code_submissions(room_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_submissions_user_id ON code_submissions(user_id) WHERE user_id IS NOT NULL;

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
  winner_reason INT NOT NULL DEFAULT 0 CHECK (winner_reason BETWEEN 0 AND 5),
  is_rated BOOLEAN NOT NULL DEFAULT TRUE,
  unrated_reason TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_matches_status_updated_at ON arena_matches(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_matches_task_id ON arena_matches(task_id);
CREATE INDEX IF NOT EXISTS idx_arena_matches_source_status_updated_at ON arena_matches(source, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_matches_rated_status ON arena_matches(is_rated, status, updated_at DESC);

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
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id),
  UNIQUE (match_id, side)
);

CREATE INDEX IF NOT EXISTS idx_arena_match_players_user_id ON arena_match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_match_players_suspicion ON arena_match_players(match_id, suspicion_count DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS arena_editor_states (
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS arena_submissions (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  output TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  runtime_ms INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  passed_count SMALLINT NOT NULL DEFAULT 0,
  total_count SMALLINT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_submissions_match_submitted_at ON arena_submissions(match_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS arena_match_queue (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  difficulty INT NOT NULL DEFAULT 0 CHECK (difficulty BETWEEN 0 AND 3),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_match_queue_lookup ON arena_match_queue(topic, difficulty, queued_at ASC);

CREATE TABLE IF NOT EXISTS arena_player_stats (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 300,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  best_runtime_ms BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_player_stats_rating ON arena_player_stats(rating DESC, wins DESC, best_runtime_ms ASC);

CREATE TABLE IF NOT EXISTS seed_runs (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS seed_runs;
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
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS podcasts;
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS geo;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
