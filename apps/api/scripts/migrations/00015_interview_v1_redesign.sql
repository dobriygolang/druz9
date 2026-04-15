-- +goose Up
CREATE OR REPLACE FUNCTION stable_uuid(input TEXT)
RETURNS UUID AS $$
  SELECT (
    SUBSTRING(md5(input), 1, 8) || '-' ||
    SUBSTRING(md5(input), 9, 4) || '-' ||
    SUBSTRING(md5(input), 13, 4) || '-' ||
    SUBSTRING(md5(input), 17, 4) || '-' ||
    SUBSTRING(md5(input), 21, 12)
  )::uuid;
$$ LANGUAGE SQL IMMUTABLE;

CREATE TABLE interview_tracks (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_blueprints (
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

CREATE TABLE interview_blueprint_aliases (
  id UUID PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES interview_blueprints(id) ON DELETE CASCADE,
  alias_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_public_start BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_content_pools (
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

CREATE TABLE interview_items (
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

CREATE TABLE interview_item_followups (
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

CREATE TABLE interview_item_rubric_dimensions (
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

CREATE TABLE interview_pool_items (
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

CREATE TABLE interview_blueprint_rounds (
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

CREATE TABLE interview_practice_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES interview_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_followup_position INT NOT NULL DEFAULT 0,
  solve_language TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  answer_text TEXT NOT NULL DEFAULT '',
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

CREATE TABLE interview_practice_followup_results (
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

CREATE TABLE interview_mock_sessions (
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

CREATE TABLE interview_mock_rounds (
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
  answer_text TEXT NOT NULL DEFAULT '',
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

CREATE TABLE interview_mock_round_followups (
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

CREATE INDEX idx_interview_items_active ON interview_items (is_active, is_practice_enabled, is_mock_enabled, round_type);
CREATE INDEX idx_interview_items_company ON interview_items (legacy_company_tag, round_type, is_active);
CREATE INDEX idx_interview_item_followups_item ON interview_item_followups (item_id, position);
CREATE INDEX idx_interview_item_rubric_dimensions_item ON interview_item_rubric_dimensions (item_id, position);
CREATE INDEX idx_interview_pool_items_pool ON interview_pool_items (pool_id, position, weight);
CREATE INDEX idx_interview_blueprint_aliases_lookup ON interview_blueprint_aliases (is_public_start, sort_order);
CREATE INDEX idx_interview_mock_sessions_user_status ON interview_mock_sessions (user_id, status, updated_at DESC);
CREATE INDEX idx_interview_mock_rounds_session ON interview_mock_rounds (session_id, round_index);
CREATE INDEX idx_interview_mock_round_followups_round ON interview_mock_round_followups (round_id, position);
CREATE INDEX idx_interview_practice_sessions_user_status ON interview_practice_sessions (user_id, status, updated_at DESC);
CREATE INDEX idx_interview_practice_followup_results_session ON interview_practice_followup_results (session_id, position);

INSERT INTO interview_tracks (id, slug, title, description, is_active)
VALUES
  ('8a1ed8ad-dde7-4d91-b73c-c7b96fda1111', 'general_swe_bigtech', 'General SWE Big Tech', 'General SWE mock programs for large product companies.', TRUE),
  ('6ef4dc87-32ec-44f7-b321-8be5c1552222', 'backend_ru_bigtech', 'Backend RU Big Tech', 'Backend mock programs for large Russian tech companies.', TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_blueprints (id, track_id, slug, title, description, level, runtime_mode, total_duration_seconds, intro_text, closing_text, is_active)
VALUES
  (
    '0e2bcf21-7f64-4120-b5e5-35ee220a3333',
    '8a1ed8ad-dde7-4d91-b73c-c7b96fda1111',
    'gma_general_swe_mid',
    'General SWE Mid',
    'AI-led mock interview for generalist software engineers targeting Google, Meta, and Amazon style loops.',
    'mid',
    'ai_first_human_ready',
    10800,
    'This mock simulates a structured generalist SWE loop with deeper coding, system design, and behavioral discussion.',
    'The session is complete. Review the feedback and focus on the weakest round before the next run.',
    TRUE
  ),
  (
    'fe2118f6-a65d-4f28-9d03-a2f888b94444',
    '6ef4dc87-32ec-44f7-b321-8be5c1552222',
    'ru_backend_mid',
    'Backend Mid RU Big Tech',
    'AI-led backend mock interview tuned for Ozon, Avito, and Yandex style backend rounds.',
    'mid',
    'ai_first_human_ready',
    9900,
    'This mock focuses on backend implementation depth, SQL fluency, systems thinking, and communication.',
    'The session is complete. Review the feedback and iterate on the lowest-signal areas before the next run.',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  track_id = EXCLUDED.track_id,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  runtime_mode = EXCLUDED.runtime_mode,
  total_duration_seconds = EXCLUDED.total_duration_seconds,
  intro_text = EXCLUDED.intro_text,
  closing_text = EXCLUDED.closing_text,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_blueprint_aliases (id, blueprint_id, alias_slug, display_name, is_public_start, sort_order)
VALUES
  ('91b10eb8-30fe-45d9-9c2a-bc0569c11001', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 'google', 'Google', TRUE, 10),
  ('91b10eb8-30fe-45d9-9c2a-bc0569c11002', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 'meta', 'Meta', TRUE, 20),
  ('91b10eb8-30fe-45d9-9c2a-bc0569c11003', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 'amazon', 'Amazon', TRUE, 30),
  ('91b10eb8-30fe-45d9-9c2a-bc0569c11004', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 'ozon', 'Ozon', TRUE, 40),
  ('91b10eb8-30fe-45d9-9c2a-bc0569c11005', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 'avito', 'Avito', TRUE, 50),
  ('91b10eb8-30fe-45d9-9c2a-bc0569c11006', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 'yandex', 'Yandex', TRUE, 60)
ON CONFLICT (id) DO UPDATE SET
  blueprint_id = EXCLUDED.blueprint_id,
  alias_slug = EXCLUDED.alias_slug,
  display_name = EXCLUDED.display_name,
  is_public_start = EXCLUDED.is_public_start,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO interview_content_pools (id, slug, title, round_type, description, is_active)
VALUES
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22001', 'gma_algorithmic', 'General SWE Algorithmic Coding', 'coding_algorithmic', 'Algorithmic coding pool for generalist SWE loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22002', 'gma_practical', 'General SWE Practical Coding', 'coding_practical', 'Practical coding pool for generalist SWE loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22003', 'gma_system_design', 'General SWE System Design', 'system_design', 'System design pool for generalist SWE loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22004', 'gma_behavioral', 'General SWE Behavioral', 'behavioral', 'Behavioral pool for generalist SWE loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22005', 'ru_backend_coding', 'Backend RU Practical Coding', 'coding_practical', 'Backend implementation pool for RU big tech mock loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22006', 'ru_backend_sql', 'Backend RU SQL', 'sql', 'SQL pool for RU big tech mock loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22007', 'ru_backend_system_design', 'Backend RU System Design', 'system_design', 'Architecture and systems pool for RU big tech mock loops.', TRUE),
  ('47af81aa-7f69-4d1e-8d18-2ccca7c22008', 'ru_backend_behavioral', 'Backend RU Behavioral', 'behavioral', 'Behavioral pool for RU big tech mock loops.', TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  round_type = EXCLUDED.round_type,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_blueprint_rounds (
  id, blueprint_id, position, round_type, title, selection_mode, fixed_item_id, pool_id, duration_seconds,
  evaluator_mode, max_followup_count, candidate_instructions_override, interviewer_instructions_override, is_active
)
VALUES
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340001', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 1, 'coding_algorithmic', 'Algorithmic Coding', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22001', 2700, 'code_execution', 2, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340002', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 2, 'coding_practical', 'Practical Coding', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22002', 2700, 'ai_review', 2, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340003', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 3, 'system_design', 'System Design', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22003', 2700, 'system_design_review', 2, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340004', '0e2bcf21-7f64-4120-b5e5-35ee220a3333', 4, 'behavioral', 'Behavioral', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22004', 1800, 'answer_review', 1, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340005', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 1, 'coding_practical', 'Backend Coding', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22005', 2700, 'ai_review', 2, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340006', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 2, 'sql', 'SQL', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22006', 1800, 'answer_review', 2, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340007', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 3, 'system_design', 'System Design', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22007', 2700, 'system_design_review', 2, '', '', TRUE),
  ('d71c4c8c-7a81-47a2-bceb-6ad4fd340008', 'fe2118f6-a65d-4f28-9d03-a2f888b94444', 4, 'behavioral', 'Behavioral', 'pool_random_weighted', NULL, '47af81aa-7f69-4d1e-8d18-2ccca7c22008', 1800, 'answer_review', 1, '', '', TRUE)
ON CONFLICT (id) DO UPDATE SET
  blueprint_id = EXCLUDED.blueprint_id,
  position = EXCLUDED.position,
  round_type = EXCLUDED.round_type,
  title = EXCLUDED.title,
  selection_mode = EXCLUDED.selection_mode,
  fixed_item_id = EXCLUDED.fixed_item_id,
  pool_id = EXCLUDED.pool_id,
  duration_seconds = EXCLUDED.duration_seconds,
  evaluator_mode = EXCLUDED.evaluator_mode,
  max_followup_count = EXCLUDED.max_followup_count,
  candidate_instructions_override = EXCLUDED.candidate_instructions_override,
  interviewer_instructions_override = EXCLUDED.interviewer_instructions_override,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_items (
  id, slug, title, round_type, delivery_mode, difficulty_level, duration_seconds, language, supported_languages, legacy_company_tag,
  is_practice_enabled, is_mock_enabled, is_executable, execution_profile, runner_mode, linked_code_task_id,
  candidate_prompt, interviewer_script, reference_solution, starter_code, debrief_template, is_active, created_at, updated_at
)
SELECT
  t.id,
  t.slug,
  t.title,
  CASE
    WHEN t.prep_type = 'algorithm' THEN 'coding_algorithmic'
    WHEN t.prep_type = 'sql' THEN 'sql'
    WHEN t.prep_type = 'system_design' THEN 'system_design'
    WHEN t.prep_type = 'behavioral' THEN 'behavioral'
    WHEN t.prep_type = 'code_review' THEN 'code_review'
    ELSE 'coding_practical'
  END,
  CASE
    WHEN t.prep_type = 'system_design' THEN 'system_design_form'
    WHEN t.prep_type IN ('behavioral', 'code_review') AND t.is_executable = FALSE THEN 'text_answer'
    WHEN lower(t.language) = 'sql' THEN 'code_editor'
    WHEN t.is_executable THEN 'code_editor'
    ELSE 'text_answer'
  END,
  'mid',
  COALESCE(NULLIF(t.duration_seconds, 0), 1800),
  t.language,
  COALESCE(t.supported_languages, ARRAY[]::TEXT[]),
  COALESCE(t.company_tag, ''),
  TRUE,
  TRUE,
  t.is_executable,
  t.execution_profile,
  t.runner_mode,
  t.code_task_id,
  t.statement,
  '',
  t.reference_solution,
  t.starter_code,
  '',
  t.is_active,
  t.created_at,
  t.updated_at
FROM interview_prep_tasks t
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  round_type = EXCLUDED.round_type,
  delivery_mode = EXCLUDED.delivery_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  duration_seconds = EXCLUDED.duration_seconds,
  language = EXCLUDED.language,
  supported_languages = EXCLUDED.supported_languages,
  legacy_company_tag = EXCLUDED.legacy_company_tag,
  is_practice_enabled = EXCLUDED.is_practice_enabled,
  is_mock_enabled = EXCLUDED.is_mock_enabled,
  is_executable = EXCLUDED.is_executable,
  execution_profile = EXCLUDED.execution_profile,
  runner_mode = EXCLUDED.runner_mode,
  linked_code_task_id = EXCLUDED.linked_code_task_id,
  candidate_prompt = EXCLUDED.candidate_prompt,
  interviewer_script = EXCLUDED.interviewer_script,
  reference_solution = EXCLUDED.reference_solution,
  starter_code = EXCLUDED.starter_code,
  debrief_template = EXCLUDED.debrief_template,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_item_followups (
  id, item_id, position, prompt, interviewer_intent, reference_answer, rubric_hint, trigger_phase, always_ask, is_active, created_at, updated_at
)
SELECT
  q.id,
  q.task_id,
  q.position,
  q.prompt,
  '',
  q.answer,
  '',
  'after_submission',
  q.position = 1,
  TRUE,
  q.created_at,
  q.updated_at
FROM interview_prep_questions q
JOIN interview_items i ON i.id = q.task_id
ON CONFLICT (id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  position = EXCLUDED.position,
  prompt = EXCLUDED.prompt,
  reference_answer = EXCLUDED.reference_answer,
  always_ask = EXCLUDED.always_ask,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_item_followups (
  id, item_id, position, prompt, interviewer_intent, reference_answer, rubric_hint, trigger_phase, always_ask, is_active, created_at, updated_at
)
SELECT
  stable_uuid(i.id::text || ':' || p.question_key),
  i.id,
  1000 + p.position,
  p.prompt,
  '',
  p.reference_answer,
  '',
  'after_submission',
  p.always_ask,
  p.is_active,
  p.created_at,
  p.updated_at
FROM interview_prep_mock_question_pools p
JOIN interview_items i
  ON i.is_active = TRUE
 AND (
   p.company_tag = ''
   OR p.company_tag = i.legacy_company_tag
 )
 AND CASE p.topic
   WHEN 'slices' THEN i.round_type = 'coding_algorithmic'
   WHEN 'concurrency' THEN i.round_type = 'coding_practical'
   WHEN 'sql' THEN i.round_type = 'sql'
   WHEN 'system_design' THEN i.round_type = 'system_design'
   WHEN 'architecture' THEN i.round_type IN ('code_review', 'behavioral')
   ELSE FALSE
 END
ON CONFLICT (id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  position = EXCLUDED.position,
  prompt = EXCLUDED.prompt,
  reference_answer = EXCLUDED.reference_answer,
  always_ask = EXCLUDED.always_ask,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_pool_items (id, pool_id, item_id, position, weight, is_active, created_at, updated_at)
SELECT
  stable_uuid('gma-alg:' || i.id::text),
  '47af81aa-7f69-4d1e-8d18-2ccca7c22001',
  i.id,
  ROW_NUMBER() OVER (ORDER BY i.created_at, i.id),
  1,
  TRUE,
  NOW(),
  NOW()
FROM interview_items i
WHERE i.is_active = TRUE
  AND i.is_mock_enabled = TRUE
  AND i.round_type = 'coding_algorithmic'
ON CONFLICT (pool_id, item_id) DO UPDATE SET
  position = EXCLUDED.position,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_pool_items (id, pool_id, item_id, position, weight, is_active, created_at, updated_at)
SELECT
  stable_uuid('gma-practical:' || i.id::text),
  '47af81aa-7f69-4d1e-8d18-2ccca7c22002',
  i.id,
  ROW_NUMBER() OVER (ORDER BY i.created_at, i.id),
  1,
  TRUE,
  NOW(),
  NOW()
FROM interview_items i
WHERE i.is_active = TRUE
  AND i.is_mock_enabled = TRUE
  AND i.round_type IN ('coding_practical', 'code_review')
ON CONFLICT (pool_id, item_id) DO UPDATE SET
  position = EXCLUDED.position,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_pool_items (id, pool_id, item_id, position, weight, is_active, created_at, updated_at)
SELECT
  stable_uuid('gma-sd:' || i.id::text),
  '47af81aa-7f69-4d1e-8d18-2ccca7c22003',
  i.id,
  ROW_NUMBER() OVER (ORDER BY i.created_at, i.id),
  1,
  TRUE,
  NOW(),
  NOW()
FROM interview_items i
WHERE i.is_active = TRUE
  AND i.is_mock_enabled = TRUE
  AND i.round_type = 'system_design'
ON CONFLICT (pool_id, item_id) DO UPDATE SET
  position = EXCLUDED.position,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_pool_items (id, pool_id, item_id, position, weight, is_active, created_at, updated_at)
SELECT
  stable_uuid('gma-beh:' || i.id::text),
  '47af81aa-7f69-4d1e-8d18-2ccca7c22004',
  i.id,
  ROW_NUMBER() OVER (ORDER BY i.created_at, i.id),
  1,
  TRUE,
  NOW(),
  NOW()
FROM interview_items i
WHERE i.is_active = TRUE
  AND i.is_mock_enabled = TRUE
  AND i.round_type = 'behavioral'
ON CONFLICT (pool_id, item_id) DO UPDATE SET
  position = EXCLUDED.position,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

WITH backend_candidates AS (
  SELECT
    i.id,
    i.slug,
    i.created_at,
    i.round_type,
    i.legacy_company_tag,
    CASE
      WHEN i.round_type IN ('coding_practical', 'code_review') THEN '47af81aa-7f69-4d1e-8d18-2ccca7c22005'::uuid
      WHEN i.round_type = 'sql' THEN '47af81aa-7f69-4d1e-8d18-2ccca7c22006'::uuid
      WHEN i.round_type = 'system_design' THEN '47af81aa-7f69-4d1e-8d18-2ccca7c22007'::uuid
      WHEN i.round_type = 'behavioral' THEN '47af81aa-7f69-4d1e-8d18-2ccca7c22008'::uuid
      ELSE NULL
    END AS pool_id,
    CASE
      WHEN i.round_type IN ('coding_practical', 'code_review') THEN 'concurrency'
      WHEN i.round_type = 'sql' THEN 'sql'
      WHEN i.round_type = 'system_design' THEN 'system_design'
      WHEN i.round_type = 'behavioral' THEN 'architecture'
      ELSE ''
    END AS stage_kind
  FROM interview_items i
  WHERE i.is_active = TRUE
    AND i.is_mock_enabled = TRUE
    AND i.round_type IN ('coding_practical', 'code_review', 'sql', 'system_design', 'behavioral')
    AND (i.legacy_company_tag IN ('', 'ozon', 'avito', 'yandex'))
),
weighted_backend_candidates AS (
  SELECT
    c.*,
    COALESCE((
      SELECT MAX(10)
      FROM interview_prep_mock_company_presets p
      WHERE p.is_active = TRUE
        AND p.company_tag = COALESCE(NULLIF(c.legacy_company_tag, ''), p.company_tag)
        AND p.stage_kind = c.stage_kind
        AND (p.task_slug_pattern = '' OR c.slug ILIKE '%' || p.task_slug_pattern || '%')
    ), 1) AS weight
  FROM backend_candidates c
  WHERE c.pool_id IS NOT NULL
)
INSERT INTO interview_pool_items (id, pool_id, item_id, position, weight, is_active, created_at, updated_at)
SELECT
  stable_uuid('ru-backend:' || pool_id::text || ':' || id::text),
  pool_id,
  id,
  ROW_NUMBER() OVER (PARTITION BY pool_id ORDER BY weight DESC, created_at, id),
  weight,
  TRUE,
  NOW(),
  NOW()
FROM weighted_backend_candidates
ON CONFLICT (pool_id, item_id) DO UPDATE SET
  position = EXCLUDED.position,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO interview_practice_sessions (
  id, user_id, item_id, status, current_followup_position, solve_language, code, answer_text,
  last_submission_passed, review_score, review_summary, started_at, finished_at, created_at, updated_at
)
SELECT
  s.id,
  s.user_id,
  s.task_id,
  s.status,
  s.current_question_position,
  s.solve_language,
  s.code,
  '',
  s.last_submission_passed,
  0,
  '',
  s.started_at,
  s.finished_at,
  s.created_at,
  s.updated_at
FROM interview_prep_sessions s
JOIN interview_items i ON i.id = s.task_id
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  item_id = EXCLUDED.item_id,
  status = EXCLUDED.status,
  current_followup_position = EXCLUDED.current_followup_position,
  solve_language = EXCLUDED.solve_language,
  code = EXCLUDED.code,
  answer_text = EXCLUDED.answer_text,
  last_submission_passed = EXCLUDED.last_submission_passed,
  review_score = EXCLUDED.review_score,
  review_summary = EXCLUDED.review_summary,
  started_at = EXCLUDED.started_at,
  finished_at = EXCLUDED.finished_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_practice_followup_results (
  id, session_id, position, prompt_snapshot, reference_answer_snapshot, candidate_answer, self_assessment, score, summary, answered_at, created_at, updated_at
)
SELECT
  r.id,
  r.session_id,
  q.position,
  q.prompt,
  q.answer,
  '',
  r.self_assessment,
  0,
  '',
  r.answered_at,
  r.answered_at,
  r.answered_at
FROM interview_prep_question_results r
JOIN interview_prep_questions q ON q.id = r.question_id
JOIN interview_practice_sessions s ON s.id = r.session_id
ON CONFLICT (id) DO UPDATE SET
  session_id = EXCLUDED.session_id,
  position = EXCLUDED.position,
  prompt_snapshot = EXCLUDED.prompt_snapshot,
  reference_answer_snapshot = EXCLUDED.reference_answer_snapshot,
  self_assessment = EXCLUDED.self_assessment,
  answered_at = EXCLUDED.answered_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_mock_sessions (
  id, user_id, blueprint_id, started_via_alias, status, current_round_index, started_at, finished_at, created_at, updated_at
)
SELECT
  ms.id,
  ms.user_id,
  CASE
    WHEN ms.company_tag IN ('google', 'meta', 'amazon') THEN '0e2bcf21-7f64-4120-b5e5-35ee220a3333'::uuid
    ELSE 'fe2118f6-a65d-4f28-9d03-a2f888b94444'::uuid
  END,
  ms.company_tag,
  ms.status,
  ms.current_stage_index,
  ms.started_at,
  ms.finished_at,
  ms.created_at,
  ms.updated_at
FROM interview_prep_mock_sessions ms
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  blueprint_id = EXCLUDED.blueprint_id,
  started_via_alias = EXCLUDED.started_via_alias,
  status = EXCLUDED.status,
  current_round_index = EXCLUDED.current_round_index,
  started_at = EXCLUDED.started_at,
  finished_at = EXCLUDED.finished_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_mock_rounds (
  id, session_id, round_index, round_type, status, blueprint_round_id, source_item_id, source_pool_id, title_snapshot,
  candidate_prompt_snapshot, interviewer_script_snapshot, reference_solution_snapshot, starter_code_snapshot, solve_language, code, answer_text,
  design_notes, design_components, design_apis, design_database_schema, design_traffic, design_reliability,
  last_submission_passed, review_score, review_summary, started_at, finished_at, created_at, updated_at
)
SELECT
  s.id,
  s.session_id,
  s.stage_index,
  CASE
    WHEN s.kind = 'slices' THEN 'coding_algorithmic'
    WHEN s.kind = 'sql' THEN 'sql'
    WHEN s.kind = 'system_design' THEN 'system_design'
    WHEN s.kind = 'architecture' THEN 'behavioral'
    ELSE 'coding_practical'
  END,
  s.status,
  NULL,
  s.task_id,
  NULL,
  COALESCE(t.title, ''),
  COALESCE(t.statement, ''),
  '',
  COALESCE(t.reference_solution, ''),
  COALESCE(t.starter_code, ''),
  s.solve_language,
  s.code,
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  s.last_submission_passed,
  s.review_score,
  s.review_summary,
  s.started_at,
  s.finished_at,
  s.created_at,
  s.updated_at
FROM interview_prep_mock_stages s
JOIN interview_mock_sessions ms ON ms.id = s.session_id
LEFT JOIN interview_prep_tasks t ON t.id = s.task_id
ON CONFLICT (id) DO UPDATE SET
  session_id = EXCLUDED.session_id,
  round_index = EXCLUDED.round_index,
  round_type = EXCLUDED.round_type,
  status = EXCLUDED.status,
  source_item_id = EXCLUDED.source_item_id,
  title_snapshot = EXCLUDED.title_snapshot,
  candidate_prompt_snapshot = EXCLUDED.candidate_prompt_snapshot,
  interviewer_script_snapshot = EXCLUDED.interviewer_script_snapshot,
  reference_solution_snapshot = EXCLUDED.reference_solution_snapshot,
  starter_code_snapshot = EXCLUDED.starter_code_snapshot,
  solve_language = EXCLUDED.solve_language,
  code = EXCLUDED.code,
  last_submission_passed = EXCLUDED.last_submission_passed,
  review_score = EXCLUDED.review_score,
  review_summary = EXCLUDED.review_summary,
  started_at = EXCLUDED.started_at,
  finished_at = EXCLUDED.finished_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO interview_mock_round_followups (
  id, round_id, position, prompt_snapshot, interviewer_intent_snapshot, reference_answer_snapshot,
  rubric_hint_snapshot, candidate_answer, score, summary, answered_at, created_at, updated_at
)
SELECT
  qr.id,
  qr.stage_id,
  qr.position,
  qr.prompt,
  '',
  qr.reference_answer,
  '',
  '',
  qr.score,
  qr.summary,
  qr.answered_at,
  qr.created_at,
  qr.updated_at
FROM interview_prep_mock_stage_question_results qr
JOIN interview_mock_rounds r ON r.id = qr.stage_id
ON CONFLICT (id) DO UPDATE SET
  round_id = EXCLUDED.round_id,
  position = EXCLUDED.position,
  prompt_snapshot = EXCLUDED.prompt_snapshot,
  reference_answer_snapshot = EXCLUDED.reference_answer_snapshot,
  score = EXCLUDED.score,
  summary = EXCLUDED.summary,
  answered_at = EXCLUDED.answered_at,
  updated_at = EXCLUDED.updated_at;

-- +goose Down
DROP TABLE IF EXISTS interview_mock_round_followups;
DROP TABLE IF EXISTS interview_mock_rounds;
DROP INDEX IF EXISTS uq_interview_mock_active_session;
DROP TABLE IF EXISTS interview_mock_sessions;
DROP TABLE IF EXISTS interview_practice_followup_results;
DROP INDEX IF EXISTS uq_interview_practice_active_session;
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
DROP FUNCTION IF EXISTS stable_uuid(TEXT);
