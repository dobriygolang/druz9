-- +goose Up

-- Store the submitted source code and language in solution_reviews so that
-- blind-review mode can serve real code samples without joining code_submissions.
ALTER TABLE solution_reviews
    ADD COLUMN IF NOT EXISTS source_code TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS language    TEXT NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE solution_reviews
    DROP COLUMN IF EXISTS language,
    DROP COLUMN IF EXISTS source_code;
