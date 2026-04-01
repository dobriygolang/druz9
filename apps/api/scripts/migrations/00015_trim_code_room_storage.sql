-- +goose Up
ALTER TABLE code_submissions
  DROP COLUMN IF EXISTS code;

ALTER TABLE code_rooms
  DROP COLUMN IF EXISTS task;

-- +goose Down
ALTER TABLE code_rooms
  ADD COLUMN IF NOT EXISTS task TEXT;

ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
