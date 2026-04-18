-- +goose Up
-- Code editor domain: tasks, rooms, submissions, duel editors, solution reviews,
-- blind review, personal bests, daily/weekly challenges.
-- Consolidated from original migrations 00003 (code_* parts), 00011, 00012, 00014,
-- 00019 (code_tasks ALTERs + task_stats + solution_reviews), 00025, 00026.

CREATE TABLE IF NOT EXISTS code_tasks (
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
  pattern TEXT NOT NULL DEFAULT '',
  optimal_time_complexity TEXT NOT NULL DEFAULT '',
  optimal_space_complexity TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_tasks_active ON code_tasks(is_active);
CREATE INDEX idx_code_tasks_topics ON code_tasks USING GIN(topics);

CREATE TABLE IF NOT EXISTS code_task_test_cases (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  weight SMALLINT NOT NULL DEFAULT 1,
  "order" SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_code_task_test_cases_task_id ON code_task_test_cases(task_id);

CREATE TABLE IF NOT EXISTS code_rooms (
  id UUID PRIMARY KEY,
  mode INT NOT NULL DEFAULT 1 CHECK (mode BETWEEN 0 AND 2),
  code TEXT NOT NULL,
  code_revision INTEGER NOT NULL DEFAULT 0,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  creator_id UUID,
  invite_code TEXT NOT NULL UNIQUE CHECK (octet_length(invite_code) BETWEEN 6 AND 32),
  task_id UUID,
  task TEXT NOT NULL DEFAULT '',
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  language INT NOT NULL DEFAULT 4 CHECK (language BETWEEN 0 AND 8),
  duel_topic TEXT CHECK (octet_length(COALESCE(duel_topic, '')) <= 64),
  winner_user_id UUID,
  winner_guest_name TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_rooms_status_updated_at ON code_rooms(status, updated_at DESC);

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

CREATE INDEX idx_code_participants_room_id ON code_participants(room_id);
CREATE INDEX idx_code_participants_user_id ON code_participants(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_code_participants_guest_name
  ON code_participants(room_id, name) WHERE is_guest = TRUE;

CREATE TABLE IF NOT EXISTS code_submissions (
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

CREATE TABLE IF NOT EXISTS code_duel_editor_states (
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  actor_key TEXT NOT NULL CHECK (octet_length(actor_key) BETWEEN 1 AND 128),
  code TEXT NOT NULL DEFAULT '',
  language INT NOT NULL DEFAULT 4 CHECK (language BETWEEN 0 AND 8),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, actor_key)
);

CREATE INDEX idx_code_duel_editor_states_updated_at
  ON code_duel_editor_states(room_id, updated_at DESC);

-- Aggregated per-task stats
CREATE TABLE IF NOT EXISTS task_stats (
  task_id UUID PRIMARY KEY REFERENCES code_tasks(id) ON DELETE CASCADE,
  median_solve_time_ms BIGINT NOT NULL DEFAULT 0,
  total_solves INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified solution reviews
CREATE TABLE IF NOT EXISTS solution_reviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('daily', 'practice', 'duel', 'mock')),
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  solve_time_ms BIGINT NOT NULL DEFAULT 0,
  median_time_ms BIGINT NOT NULL DEFAULT 0,
  passed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  ai_verdict TEXT CHECK (ai_verdict IN ('optimal', 'good', 'suboptimal', 'brute_force')),
  ai_time_complexity TEXT,
  ai_space_complexity TEXT,
  ai_pattern TEXT,
  ai_strengths TEXT[] NOT NULL DEFAULT '{}',
  ai_weaknesses TEXT[] NOT NULL DEFAULT '{}',
  ai_hint TEXT,
  ai_skill_signals JSONB,
  ai_provider TEXT,
  ai_model TEXT,
  source_code TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  opponent_submission_id UUID,
  comparison_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solution_reviews_user_task ON solution_reviews(user_id, task_id);
CREATE INDEX idx_solution_reviews_user_pattern ON solution_reviews(user_id, ai_pattern) WHERE ai_pattern IS NOT NULL;
CREATE INDEX idx_solution_reviews_submission ON solution_reviews(submission_id);
CREATE INDEX idx_solution_reviews_user_created ON solution_reviews(user_id, created_at DESC);

-- Blind review: user reviews anonymous code, AI evaluates.
CREATE TABLE IF NOT EXISTS blind_review_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_review_id UUID        NOT NULL,
  task_id          UUID        NOT NULL,
  source_code      TEXT        NOT NULL DEFAULT '',
  source_language  TEXT        NOT NULL DEFAULT '',
  user_review      TEXT        NOT NULL DEFAULT '',
  ai_score         INT         NOT NULL DEFAULT 0,
  ai_feedback      TEXT        NOT NULL DEFAULT '',
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brs_user ON blind_review_sessions(user_id, submitted_at DESC);

-- Personal-best records (speed-run mode).
CREATE TABLE IF NOT EXISTS user_task_records (
  user_id         UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id         UUID    NOT NULL,
  best_time_ms    BIGINT  NOT NULL,
  best_ai_score   INT     NOT NULL DEFAULT 0,
  attempts        INT     NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);

-- Weekly boss entries.
CREATE TABLE IF NOT EXISTS weekly_challenge_entries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key      TEXT        NOT NULL,
  task_id       UUID        NOT NULL,
  ai_score      INT         NOT NULL DEFAULT 0,
  solve_time_ms BIGINT      NOT NULL DEFAULT 0,
  code          TEXT        NOT NULL DEFAULT '',
  language      TEXT        NOT NULL DEFAULT '',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_key)
);

CREATE INDEX idx_wce_week_score ON weekly_challenge_entries(week_key, ai_score DESC, solve_time_ms ASC);

-- Daily challenge results.
CREATE TABLE IF NOT EXISTS daily_challenge_results (
  user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE    NOT NULL,
  task_id        UUID    NOT NULL,
  ai_score       INT     NOT NULL DEFAULT 0,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_date)
);

CREATE INDEX idx_dcr_date_score ON daily_challenge_results(challenge_date, ai_score DESC);

-- +goose Down
DROP TABLE IF EXISTS daily_challenge_results;
DROP TABLE IF EXISTS weekly_challenge_entries;
DROP TABLE IF EXISTS user_task_records;
DROP TABLE IF EXISTS blind_review_sessions;
DROP TABLE IF EXISTS solution_reviews;
DROP TABLE IF EXISTS task_stats;
DROP TABLE IF EXISTS code_duel_editor_states;
DROP TABLE IF EXISTS code_submissions;
DROP TABLE IF EXISTS code_participants;
DROP TABLE IF EXISTS code_rooms;
DROP TABLE IF EXISTS code_task_test_cases;
DROP TABLE IF EXISTS code_tasks;
