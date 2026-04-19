-- +goose Up
-- +goose StatementBegin

-- ADR-005 — Per-user UI preferences. Distinct from user_notification_settings
-- which lives in the notification-service domain. One row per user; created
-- lazily on first GetUserPreferences call (or backfill below for existing
-- users to keep the GET path branch-free).
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id         UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    layout_density  TEXT         NOT NULL DEFAULT 'comfortable'
                    CHECK (layout_density IN ('comfortable','compact')),
    locale          TEXT         NOT NULL DEFAULT 'ru'
                    CHECK (locale IN ('ru','en')),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Backfill: every existing user gets a default row so reads never hit a
-- "no row" branch. New signups insert via ON CONFLICT in the handler.
INSERT INTO user_preferences (user_id)
    SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS user_preferences;
-- +goose StatementEnd
