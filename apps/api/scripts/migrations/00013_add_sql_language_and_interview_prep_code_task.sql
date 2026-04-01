-- +goose Up
ALTER TABLE code_tasks
  DROP CONSTRAINT IF EXISTS code_tasks_language_check;

ALTER TABLE code_tasks
  ADD CONSTRAINT code_tasks_language_check
  CHECK (language BETWEEN 0 AND 8);

ALTER TABLE interview_prep_tasks
  ADD COLUMN IF NOT EXISTS code_task_id UUID REFERENCES code_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interview_prep_tasks_code_task
  ON interview_prep_tasks (code_task_id);

-- +goose Down
DROP INDEX IF EXISTS idx_interview_prep_tasks_code_task;

ALTER TABLE interview_prep_tasks
  DROP COLUMN IF EXISTS code_task_id;

ALTER TABLE code_tasks
  DROP CONSTRAINT IF EXISTS code_tasks_language_check;

ALTER TABLE code_tasks
  ADD CONSTRAINT code_tasks_language_check
  CHECK (language BETWEEN 0 AND 7);
