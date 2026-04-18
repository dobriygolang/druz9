-- +goose Up
-- +goose StatementBegin

-- Wave E.3 — AI mentor catalog. Each row describes a named AI persona that
-- interview_prep can invoke for mock sessions and coaching feedback.
-- provider: 'anthropic' | 'openai' | 'mock'
-- tier: 0 = free, 1 = premium
CREATE TABLE IF NOT EXISTS ai_mentors (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    provider        TEXT        NOT NULL DEFAULT 'anthropic',
    model_id        TEXT        NOT NULL DEFAULT 'claude-sonnet-4-6',
    tier            INT         NOT NULL DEFAULT 0,
    prompt_template TEXT        NOT NULL DEFAULT '',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a default mentor so the table is never empty on first deploy.
INSERT INTO ai_mentors (name, provider, model_id, tier, prompt_template)
VALUES ('Alex (Default)', 'anthropic', 'claude-sonnet-4-6', 0,
        'You are Alex, a friendly senior software engineer helping candidates prepare for technical interviews. Be concise, constructive, and encouraging.')
ON CONFLICT DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS ai_mentors;
-- +goose StatementEnd
