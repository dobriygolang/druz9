-- +goose Up
-- +goose StatementBegin

-- ADR-005 — Cross-device saved-podcasts list. Replaces the localStorage
-- "Saved" tab on /podcasts so a user's list follows them between devices.
CREATE TABLE IF NOT EXISTS user_saved_podcasts (
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    podcast_id UUID         NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
    saved_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, podcast_id)
);

-- "List my saves, newest first" — direct index hit.
CREATE INDEX IF NOT EXISTS idx_user_saved_podcasts_recent
    ON user_saved_podcasts(user_id, saved_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_saved_podcasts_recent;
DROP TABLE IF EXISTS user_saved_podcasts;
-- +goose StatementEnd
