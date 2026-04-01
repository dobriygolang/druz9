-- +goose Up
ALTER TABLE arena_submissions
  DROP COLUMN IF EXISTS code;

-- +goose Down
ALTER TABLE arena_submissions
  ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
