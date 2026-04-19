-- +goose Up
-- +goose StatementBegin

-- ADR-002 — Personalized "card of advice" rendered on the Atlas page.
-- One row per user, refreshed by the insights cron (run daily for active
-- users). The body is a JSON blob so the schema can evolve without a
-- migration each time the prompt template changes.
CREATE TABLE IF NOT EXISTS user_insights (
    user_id        UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    summary        TEXT         NOT NULL DEFAULT '',
    top_strengths  JSONB        NOT NULL DEFAULT '[]'::jsonb,
    top_gaps       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    next_steps     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    generated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Source tag: 'deterministic' (rule-based, no LLM) or 'llm:<model_id>'.
    source         TEXT         NOT NULL DEFAULT 'deterministic'
);

-- Used by the cron sweep to find which users need a refresh ("haven't
-- regenerated in N hours, but logged in within the last 7 days").
CREATE INDEX IF NOT EXISTS idx_user_insights_generated_at ON user_insights(generated_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_insights_generated_at;
DROP TABLE IF EXISTS user_insights;
-- +goose StatementEnd
