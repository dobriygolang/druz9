-- +goose Up
-- +goose StatementBegin
ALTER TABLE arena_matches
ADD COLUMN IF NOT EXISTS anti_cheat_enabled BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE arena_matches
DROP COLUMN IF EXISTS anti_cheat_enabled;
-- +goose StatementEnd