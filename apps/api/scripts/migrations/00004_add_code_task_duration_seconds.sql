-- +goose Up
-- +goose StatementBegin
ALTER TABLE code_tasks
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE code_tasks
  DROP COLUMN IF EXISTS duration_seconds;
-- +goose StatementEnd