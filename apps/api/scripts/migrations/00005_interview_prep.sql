-- +goose Up
-- Interview preparation: both the legacy prep_* tables (still referenced by
-- older flows) and the v1-redesign interview_* family introduced in 00015.
-- Consolidated from original migrations 00004, 00006, 00015, 00027 (column drops).

CREATE TABLE IF NOT EXISTS interview_prep_tasks (
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

CREATE INDEX idx_interview_prep_tasks_active ON interview_prep_tasks (is_active, prep_type);
CREATE INDEX idx_interview_prep_tasks_code_task ON interview_prep_tasks (code_task_id);
CREATE INDEX idx_interview_prep_tasks_company_tag ON interview_prep_tasks (company_tag);

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

CREATE INDEX idx_interview_prep_questions_task_position ON interview_prep_questions (task_id, position);

CREATE TABLE IF NOT EXISTS interview_prep_sessions (
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

CREATE INDEX idx_interview_prep_sessions_user_status ON interview_prep_sessions (user_id, status, updated_at DESC);
CREATE INDEX idx_interview_prep_sessions_task ON interview_prep_sessions (task_id);

CREATE TABLE IF NOT EXISTS interview_prep_question_results (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_prep_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_prep_questions(id) ON DELETE CASCADE,
  self_assessment TEXT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX idx_interview_prep_question_results_session ON interview_prep_question_results (session_id);

CREATE TABLE IF NOT EXISTS interview_prep_mock_sessions (
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

CREATE TABLE IF NOT EXISTS interview_prep_mock_stages (
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

CREATE TABLE IF NOT EXISTS interview_prep_mock_stage_question_results (
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

CREATE TABLE IF NOT EXISTS interview_prep_mock_question_pools (
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

CREATE TABLE IF NOT EXISTS interview_prep_mock_company_presets (
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

-- Legacy checkpoint table (from 00006).
CREATE TABLE IF NOT EXISTS interview_prep_checkpoints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE REFERENCES interview_prep_sessions(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  duration_seconds INT NOT NULL DEFAULT 900,
  attempts_used INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 2,
  score INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_checkpoints_status_check CHECK (status IN ('active', 'passed', 'failed', 'expired'))
);

CREATE INDEX idx_interview_prep_checkpoints_user_status
  ON interview_prep_checkpoints(user_id, status, updated_at DESC);
CREATE INDEX idx_interview_prep_checkpoints_skill_status
  ON interview_prep_checkpoints(skill_key, status, updated_at DESC);

-- v1 redesign (from 00015).
CREATE TABLE IF NOT EXISTS interview_tracks (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_blueprints (
  id UUID PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES interview_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'mid',
  runtime_mode TEXT NOT NULL DEFAULT 'ai_first_human_ready',
  total_duration_seconds INT NOT NULL DEFAULT 0,
  intro_text TEXT NOT NULL DEFAULT '',
  closing_text TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_blueprints_runtime_mode_check
    CHECK (runtime_mode IN ('ai_first_human_ready', 'ai_only', 'human_ai_parity'))
);

CREATE TABLE IF NOT EXISTS interview_blueprint_aliases (
  id UUID PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES interview_blueprints(id) ON DELETE CASCADE,
  alias_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_public_start BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_blueprint_aliases_lookup
  ON interview_blueprint_aliases (is_public_start, sort_order);

CREATE TABLE IF NOT EXISTS interview_content_pools (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  round_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_content_pools_round_type_check
    CHECK (round_type IN ('coding_algorithmic', 'coding_practical', 'sql', 'system_design', 'behavioral', 'code_review'))
);

CREATE TABLE IF NOT EXISTS interview_items (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  round_type TEXT NOT NULL,
  delivery_mode TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'mid',
  duration_seconds INT NOT NULL DEFAULT 1800,
  language TEXT NOT NULL DEFAULT '',
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  legacy_company_tag TEXT NOT NULL DEFAULT '',
  is_practice_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_mock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_executable BOOLEAN NOT NULL DEFAULT FALSE,
  execution_profile TEXT NOT NULL DEFAULT '',
  runner_mode TEXT NOT NULL DEFAULT '',
  linked_code_task_id UUID REFERENCES code_tasks(id) ON DELETE SET NULL,
  candidate_prompt TEXT NOT NULL DEFAULT '',
  interviewer_script TEXT NOT NULL DEFAULT '',
  reference_solution TEXT NOT NULL DEFAULT '',
  starter_code TEXT NOT NULL DEFAULT '',
  debrief_template TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_items_round_type_check
    CHECK (round_type IN ('coding_algorithmic', 'coding_practical', 'sql', 'system_design', 'behavioral', 'code_review')),
  CONSTRAINT interview_items_delivery_mode_check
    CHECK (delivery_mode IN ('code_editor', 'text_answer', 'system_design_form'))
);

CREATE INDEX idx_interview_items_active
  ON interview_items (is_active, is_practice_enabled, is_mock_enabled, round_type);
CREATE INDEX idx_interview_items_company
  ON interview_items (legacy_company_tag, round_type, is_active);

CREATE TABLE IF NOT EXISTS interview_item_followups (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES interview_items(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt TEXT NOT NULL,
  interviewer_intent TEXT NOT NULL DEFAULT '',
  reference_answer TEXT NOT NULL DEFAULT '',
  rubric_hint TEXT NOT NULL DEFAULT '',
  trigger_phase TEXT NOT NULL DEFAULT 'after_submission',
  always_ask BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_item_followups_item_position_unique UNIQUE (item_id, position),
  CONSTRAINT interview_item_followups_trigger_phase_check
    CHECK (trigger_phase IN ('after_submission', 'after_solution', 'post_round'))
);

CREATE INDEX idx_interview_item_followups_item ON interview_item_followups (item_id, position);

CREATE TABLE IF NOT EXISTS interview_item_rubric_dimensions (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES interview_items(id) ON DELETE CASCADE,
  position INT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weight INT NOT NULL DEFAULT 1,
  scoring_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_item_rubric_dimensions_item_position_unique UNIQUE (item_id, position),
  CONSTRAINT interview_item_rubric_dimensions_item_key_unique UNIQUE (item_id, key)
);

CREATE INDEX idx_interview_item_rubric_dimensions_item ON interview_item_rubric_dimensions (item_id, position);

CREATE TABLE IF NOT EXISTS interview_pool_items (
  id UUID PRIMARY KEY,
  pool_id UUID NOT NULL REFERENCES interview_content_pools(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES interview_items(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  weight INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_pool_items_pool_item_unique UNIQUE (pool_id, item_id)
);

CREATE INDEX idx_interview_pool_items_pool ON interview_pool_items (pool_id, position, weight);

CREATE TABLE IF NOT EXISTS interview_blueprint_rounds (
  id UUID PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES interview_blueprints(id) ON DELETE CASCADE,
  position INT NOT NULL,
  round_type TEXT NOT NULL,
  title TEXT NOT NULL,
  selection_mode TEXT NOT NULL,
  fixed_item_id UUID REFERENCES interview_items(id) ON DELETE SET NULL,
  pool_id UUID REFERENCES interview_content_pools(id) ON DELETE SET NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  evaluator_mode TEXT NOT NULL DEFAULT '',
  max_followup_count INT NOT NULL DEFAULT 0,
  candidate_instructions_override TEXT NOT NULL DEFAULT '',
  interviewer_instructions_override TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_blueprint_rounds_blueprint_position_unique UNIQUE (blueprint_id, position),
  CONSTRAINT interview_blueprint_rounds_round_type_check
    CHECK (round_type IN ('coding_algorithmic', 'coding_practical', 'sql', 'system_design', 'behavioral', 'code_review')),
  CONSTRAINT interview_blueprint_rounds_selection_mode_check
    CHECK (selection_mode IN ('fixed_item', 'pool_random_weighted')),
  CONSTRAINT interview_blueprint_rounds_selection_target_check
    CHECK (
      (selection_mode = 'fixed_item' AND fixed_item_id IS NOT NULL AND pool_id IS NULL) OR
      (selection_mode = 'pool_random_weighted' AND fixed_item_id IS NULL AND pool_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS interview_practice_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES interview_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_followup_position INT NOT NULL DEFAULT 0,
  solve_language TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  last_submission_passed BOOLEAN NOT NULL DEFAULT FALSE,
  review_score INT NOT NULL DEFAULT 0,
  review_summary TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_practice_sessions_status_check CHECK (status IN ('active', 'finished'))
);

CREATE UNIQUE INDEX uq_interview_practice_active_session
  ON interview_practice_sessions (user_id, item_id)
  WHERE status = 'active';
CREATE INDEX idx_interview_practice_sessions_user_status
  ON interview_practice_sessions (user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS interview_practice_followup_results (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_practice_sessions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt_snapshot TEXT NOT NULL DEFAULT '',
  reference_answer_snapshot TEXT NOT NULL DEFAULT '',
  candidate_answer TEXT NOT NULL DEFAULT '',
  self_assessment TEXT NOT NULL DEFAULT '',
  score INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_practice_followup_results_session_position_unique UNIQUE (session_id, position)
);

CREATE INDEX idx_interview_practice_followup_results_session
  ON interview_practice_followup_results (session_id, position);

CREATE TABLE IF NOT EXISTS interview_mock_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES interview_blueprints(id) ON DELETE SET NULL,
  started_via_alias TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  current_round_index INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_mock_sessions_status_check CHECK (status IN ('active', 'finished'))
);

CREATE UNIQUE INDEX uq_interview_mock_active_session
  ON interview_mock_sessions (user_id)
  WHERE status = 'active';
CREATE INDEX idx_interview_mock_sessions_user_status
  ON interview_mock_sessions (user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS interview_mock_rounds (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_mock_sessions(id) ON DELETE CASCADE,
  round_index INT NOT NULL,
  round_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  blueprint_round_id UUID REFERENCES interview_blueprint_rounds(id) ON DELETE SET NULL,
  source_item_id UUID REFERENCES interview_items(id) ON DELETE SET NULL,
  source_pool_id UUID REFERENCES interview_content_pools(id) ON DELETE SET NULL,
  title_snapshot TEXT NOT NULL DEFAULT '',
  candidate_prompt_snapshot TEXT NOT NULL DEFAULT '',
  interviewer_script_snapshot TEXT NOT NULL DEFAULT '',
  reference_solution_snapshot TEXT NOT NULL DEFAULT '',
  starter_code_snapshot TEXT NOT NULL DEFAULT '',
  solve_language TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  design_notes TEXT NOT NULL DEFAULT '',
  design_components TEXT NOT NULL DEFAULT '',
  design_apis TEXT NOT NULL DEFAULT '',
  design_database_schema TEXT NOT NULL DEFAULT '',
  design_traffic TEXT NOT NULL DEFAULT '',
  design_reliability TEXT NOT NULL DEFAULT '',
  last_submission_passed BOOLEAN NOT NULL DEFAULT FALSE,
  review_score INT NOT NULL DEFAULT 0,
  review_summary TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_mock_rounds_session_round_unique UNIQUE (session_id, round_index),
  CONSTRAINT interview_mock_rounds_round_type_check
    CHECK (round_type IN ('coding_algorithmic', 'coding_practical', 'sql', 'system_design', 'behavioral', 'code_review')),
  CONSTRAINT interview_mock_rounds_status_check
    CHECK (status IN ('pending', 'solving', 'questions', 'completed'))
);

CREATE INDEX idx_interview_mock_rounds_session ON interview_mock_rounds (session_id, round_index);

CREATE TABLE IF NOT EXISTS interview_mock_round_followups (
  id UUID PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES interview_mock_rounds(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt_snapshot TEXT NOT NULL DEFAULT '',
  interviewer_intent_snapshot TEXT NOT NULL DEFAULT '',
  reference_answer_snapshot TEXT NOT NULL DEFAULT '',
  rubric_hint_snapshot TEXT NOT NULL DEFAULT '',
  candidate_answer TEXT NOT NULL DEFAULT '',
  score INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  answered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_mock_round_followups_round_position_unique UNIQUE (round_id, position)
);

CREATE INDEX idx_interview_mock_round_followups_round ON interview_mock_round_followups (round_id, position);

-- +goose Down
DROP TABLE IF EXISTS interview_mock_round_followups;
DROP TABLE IF EXISTS interview_mock_rounds;
DROP TABLE IF EXISTS interview_mock_sessions;
DROP TABLE IF EXISTS interview_practice_followup_results;
DROP TABLE IF EXISTS interview_practice_sessions;
DROP TABLE IF EXISTS interview_blueprint_rounds;
DROP TABLE IF EXISTS interview_pool_items;
DROP TABLE IF EXISTS interview_item_rubric_dimensions;
DROP TABLE IF EXISTS interview_item_followups;
DROP TABLE IF EXISTS interview_items;
DROP TABLE IF EXISTS interview_content_pools;
DROP TABLE IF EXISTS interview_blueprint_aliases;
DROP TABLE IF EXISTS interview_blueprints;
DROP TABLE IF EXISTS interview_tracks;
DROP TABLE IF EXISTS interview_prep_checkpoints;
DROP TABLE IF EXISTS interview_prep_mock_company_presets;
DROP TABLE IF EXISTS interview_prep_mock_question_pools;
DROP TABLE IF EXISTS interview_prep_mock_stage_question_results;
DROP TABLE IF EXISTS interview_prep_mock_stages;
DROP TABLE IF EXISTS interview_prep_mock_sessions;
DROP TABLE IF EXISTS interview_prep_question_results;
DROP TABLE IF EXISTS interview_prep_sessions;
DROP TABLE IF EXISTS interview_prep_questions;
DROP TABLE IF EXISTS interview_prep_tasks;
