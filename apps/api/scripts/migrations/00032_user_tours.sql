-- +goose Up
-- +goose StatementBegin

-- ADR-004 — Per-user "tour completed" set. Frontend (react-joyride or
-- equivalent) checks this list before triggering an onboarding tour for
-- a given page (arena, war, events, hub, …) and writes back when the
-- user finishes or skips. One row per (user, tour) for fine-grained
-- analytics later.
CREATE TABLE IF NOT EXISTS user_tours (
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tour_id      TEXT         NOT NULL,
    completed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tours_completed ON user_tours(user_id, completed_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_tours_completed;
DROP TABLE IF EXISTS user_tours;
-- +goose StatementEnd
