-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS code_rooms (
  id UUID PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'all' CHECK (mode IN ('all', 'duel')),
  code TEXT NOT NULL,
  code_revision BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  creator_id UUID,
  invite_code TEXT NOT NULL UNIQUE,
  task TEXT,
  task_id UUID,
  duel_topic TEXT,
  winner_user_id UUID,
  winner_guest_name TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_rooms_invite_code ON code_rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_code_rooms_status ON code_rooms(status);
CREATE INDEX IF NOT EXISTS idx_code_rooms_created_at ON code_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_code_rooms_updated_at ON code_rooms(updated_at);

CREATE TABLE IF NOT EXISTS code_participants (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT TRUE,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_code_participants_room_id ON code_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_code_participants_user_id ON code_participants(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_code_participants_guest_name
ON code_participants(room_id, name) WHERE is_guest = true;

CREATE TABLE IF NOT EXISTS code_submissions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  guest_name TEXT,
  code TEXT NOT NULL,
  output TEXT,
  error TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms BIGINT NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  passed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_code_submissions_room_id ON code_submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_user_id ON code_submissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_code_submissions_submitted_at ON code_submissions(submitted_at);

CREATE TABLE IF NOT EXISTS code_tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  statement TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  starter_code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'go',
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
  weight INT NOT NULL DEFAULT 1,
  "order" INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_code_task_test_cases_task_id ON code_task_test_cases(task_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS code_task_test_cases CASCADE;
DROP TABLE IF EXISTS code_tasks CASCADE;
DROP TABLE IF EXISTS code_submissions CASCADE;
DROP TABLE IF EXISTS code_participants CASCADE;
DROP TABLE IF EXISTS code_rooms CASCADE;
-- +goose StatementEnd
