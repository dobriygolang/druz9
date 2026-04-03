-- +goose Up
CREATE TABLE interview_prep_tasks (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  prep_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'go',
  company_tag TEXT NOT NULL DEFAULT '',
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_executable BOOLEAN NOT NULL DEFAULT TRUE,
  execution_profile TEXT NOT NULL DEFAULT 'pure',
  runner_mode TEXT NOT NULL DEFAULT 'function_io',
  duration_seconds INT NOT NULL DEFAULT 1800,
  starter_code TEXT NOT NULL DEFAULT '',
  reference_solution TEXT NOT NULL DEFAULT '',
  code_task_id UUID REFERENCES code_tasks(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_prep_questions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, position)
);

CREATE TABLE interview_prep_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_question_position INT NOT NULL DEFAULT 0,
  solve_language TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  last_submission_passed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_interview_prep_active_session
  ON interview_prep_sessions (user_id, task_id)
  WHERE status = 'active';

CREATE TABLE interview_prep_question_results (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_prep_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_prep_questions(id) ON DELETE CASCADE,
  self_assessment TEXT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX idx_interview_prep_tasks_active ON interview_prep_tasks (is_active, prep_type);
CREATE INDEX idx_interview_prep_tasks_code_task ON interview_prep_tasks (code_task_id);
CREATE INDEX idx_interview_prep_tasks_company_tag ON interview_prep_tasks (company_tag);
CREATE INDEX idx_interview_prep_questions_task_position ON interview_prep_questions (task_id, position);
CREATE INDEX idx_interview_prep_sessions_user_status ON interview_prep_sessions (user_id, status, updated_at DESC);
CREATE INDEX idx_interview_prep_sessions_task ON interview_prep_sessions (task_id);
CREATE INDEX idx_interview_prep_question_results_session ON interview_prep_question_results (session_id);

CREATE TABLE interview_prep_mock_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_tag TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  current_stage_index INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_mock_sessions_status_check CHECK (status IN ('active', 'finished'))
);

CREATE INDEX idx_interview_prep_mock_sessions_user_status
  ON interview_prep_mock_sessions(user_id, status, updated_at DESC);

CREATE TABLE interview_prep_mock_stages (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_prep_mock_sessions(id) ON DELETE CASCADE,
  stage_index INT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'solving',
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE RESTRICT,
  solve_language TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  last_submission_passed BOOLEAN NOT NULL DEFAULT FALSE,
  review_score INT NOT NULL DEFAULT 0,
  review_summary TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_mock_stages_kind_check CHECK (kind IN ('slices', 'concurrency', 'sql', 'architecture', 'system_design')),
  CONSTRAINT interview_prep_mock_stages_status_check CHECK (status IN ('pending', 'solving', 'questions', 'completed')),
  CONSTRAINT interview_prep_mock_stages_session_index_unique UNIQUE (session_id, stage_index)
);

CREATE INDEX idx_interview_prep_mock_stages_session
  ON interview_prep_mock_stages(session_id, stage_index);

CREATE TABLE interview_prep_mock_stage_question_results (
  id UUID PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES interview_prep_mock_stages(id) ON DELETE CASCADE,
  position INT NOT NULL,
  question_key TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  reference_answer TEXT NOT NULL DEFAULT '',
  score INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  answered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_mock_stage_question_results_stage_position_unique UNIQUE(stage_id, position)
);

CREATE INDEX idx_interview_prep_mock_stage_question_results_stage
  ON interview_prep_mock_stage_question_results(stage_id, position);

CREATE TABLE interview_prep_mock_question_pools (
  id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  company_tag TEXT NOT NULL DEFAULT '',
  question_key TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL,
  reference_answer TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  always_ask BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_mock_question_pools_unique UNIQUE(topic, company_tag, question_key)
);

CREATE INDEX idx_interview_prep_mock_question_pools_lookup
  ON interview_prep_mock_question_pools(topic, company_tag, is_active, position);

CREATE TABLE interview_prep_mock_company_presets (
  id UUID PRIMARY KEY,
  company_tag TEXT NOT NULL,
  stage_kind TEXT NOT NULL,
  position INT NOT NULL,
  task_slug_pattern TEXT NOT NULL DEFAULT '',
  ai_model_override TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_mock_company_presets_stage_kind_check CHECK (stage_kind IN ('slices', 'concurrency', 'sql', 'architecture', 'system_design')),
  CONSTRAINT interview_prep_mock_company_presets_unique UNIQUE(company_tag, stage_kind, position)
);

CREATE INDEX idx_interview_prep_mock_company_presets_lookup
  ON interview_prep_mock_company_presets(company_tag, is_active, position);

-- +goose Down
DROP TABLE IF EXISTS interview_prep_mock_company_presets;
DROP TABLE IF EXISTS interview_prep_mock_question_pools;
DROP TABLE IF EXISTS interview_prep_mock_stage_question_results;
DROP TABLE IF EXISTS interview_prep_mock_stages;
DROP TABLE IF EXISTS interview_prep_mock_sessions;
DROP TABLE IF EXISTS interview_prep_question_results;
DROP INDEX IF EXISTS uq_interview_prep_active_session;
DROP TABLE IF EXISTS interview_prep_sessions;
DROP TABLE IF EXISTS interview_prep_questions;
DROP TABLE IF EXISTS interview_prep_tasks;
