-- +goose Up
-- +goose StatementBegin

-- Killer feature #5 — Anonymous Interview Experience Board. Users who
-- have interviewed at a company post a structured report (questions,
-- loop structure, feedback). Calibrated by mod queue so spam doesn't
-- leak into the public feed. This is the seed data for blueprint
-- accuracy and arguably the best B2B signal we have.

CREATE TABLE IF NOT EXISTS interview_experiences (
    id                 UUID        PRIMARY KEY,
    user_id            UUID        NOT NULL,
    company_tag        TEXT        NOT NULL,  -- "yandex", "google", …
    role               TEXT        NOT NULL DEFAULT '',
    level              TEXT        NOT NULL DEFAULT '',  -- junior/mid/senior/staff
    overall_rating     INT         NOT NULL DEFAULT 3,   -- 1..5
    loop_structure     TEXT        NOT NULL DEFAULT '',  -- free-form
    questions          TEXT        NOT NULL DEFAULT '',  -- free-form
    feedback_received  TEXT        NOT NULL DEFAULT '',
    outcome            TEXT        NOT NULL DEFAULT '',  -- offer/no-offer/pending/withdrew
    is_anonymous       BOOL        NOT NULL DEFAULT TRUE,
    moderation_status  TEXT        NOT NULL DEFAULT 'pending', -- pending/approved/rejected
    posted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_experiences_company ON interview_experiences(company_tag, posted_at DESC) WHERE moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_interview_experiences_user    ON interview_experiences(user_id, posted_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS interview_experiences;
-- +goose StatementEnd
