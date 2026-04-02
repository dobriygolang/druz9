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

CREATE INDEX IF NOT EXISTS idx_interview_prep_mock_sessions_user_status
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

CREATE INDEX IF NOT EXISTS idx_interview_prep_mock_stages_session
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

CREATE INDEX IF NOT EXISTS idx_interview_prep_mock_stage_question_results_stage
    ON interview_prep_mock_stage_question_results(stage_id, position);
