-- +goose Up
ALTER TABLE arena_submissions
ADD COLUMN IF NOT EXISTS failed_test_index INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_kind INT NOT NULL DEFAULT 0;

ALTER TABLE arena_submissions
DROP CONSTRAINT IF EXISTS arena_submissions_failure_kind_check;

ALTER TABLE arena_submissions
ADD CONSTRAINT arena_submissions_failure_kind_check
CHECK (failure_kind BETWEEN 0 AND 4);

-- +goose Down
ALTER TABLE arena_submissions
DROP CONSTRAINT IF EXISTS arena_submissions_failure_kind_check;

ALTER TABLE arena_submissions
DROP COLUMN IF EXISTS failure_kind,
DROP COLUMN IF EXISTS failed_test_index;