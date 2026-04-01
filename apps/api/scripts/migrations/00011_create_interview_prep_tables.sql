-- +goose Up
CREATE TABLE IF NOT EXISTS interview_prep_tasks (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  prep_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'go',
  is_executable BOOLEAN NOT NULL DEFAULT TRUE,
  execution_profile TEXT NOT NULL DEFAULT 'pure',
  runner_mode TEXT NOT NULL DEFAULT 'function_io',
  duration_seconds INT NOT NULL DEFAULT 1800,
  starter_code TEXT NOT NULL DEFAULT '',
  reference_solution TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_prep_questions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, position)
);

CREATE TABLE IF NOT EXISTS interview_prep_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_question_position INT NOT NULL DEFAULT 0,
  code TEXT NOT NULL DEFAULT '',
  last_submission_passed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_prep_question_results (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_prep_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_prep_questions(id) ON DELETE CASCADE,
  self_assessment TEXT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_tasks_active
  ON interview_prep_tasks (is_active, prep_type);

CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_task_position
  ON interview_prep_questions (task_id, position);

CREATE INDEX IF NOT EXISTS idx_interview_prep_sessions_user_status
  ON interview_prep_sessions (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_prep_sessions_task
  ON interview_prep_sessions (task_id);

CREATE INDEX IF NOT EXISTS idx_interview_prep_question_results_session
  ON interview_prep_question_results (session_id);

-- +goose Down
DROP TABLE IF EXISTS interview_prep_question_results;
DROP TABLE IF EXISTS interview_prep_sessions;
DROP TABLE IF EXISTS interview_prep_questions;
DROP TABLE IF EXISTS interview_prep_tasks;