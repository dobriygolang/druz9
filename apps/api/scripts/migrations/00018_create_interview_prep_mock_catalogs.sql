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

CREATE INDEX IF NOT EXISTS idx_interview_prep_mock_question_pools_lookup
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

CREATE INDEX IF NOT EXISTS idx_interview_prep_mock_company_presets_lookup
    ON interview_prep_mock_company_presets(company_tag, is_active, position);
