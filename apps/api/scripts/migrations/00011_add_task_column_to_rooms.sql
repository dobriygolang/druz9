-- +goose Up
ALTER TABLE code_rooms ADD COLUMN IF NOT EXISTS task TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE code_rooms DROP COLUMN IF EXISTS task;
