-- +goose Up
ALTER TABLE code_rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE code_rooms DROP COLUMN IF EXISTS is_private;
