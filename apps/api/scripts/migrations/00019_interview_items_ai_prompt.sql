-- +goose Up
-- +goose StatementBegin

-- Per-task AI review prompt: the evaluator sends this to the model
-- alongside the candidate's submission. Empty value keeps the
-- platform-default prompt. Letting admins write a rubric per task
-- means different question types (algo vs system-design vs behavioral)
-- can each pin the grading axes that matter.
ALTER TABLE interview_items
    ADD COLUMN IF NOT EXISTS ai_review_prompt TEXT NOT NULL DEFAULT '';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE interview_items DROP COLUMN IF EXISTS ai_review_prompt;
-- +goose StatementEnd
