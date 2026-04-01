-- +goose Up
ALTER TABLE interview_prep_tasks
  ADD COLUMN IF NOT EXISTS company_tag TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supported_languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE interview_prep_sessions
  ADD COLUMN IF NOT EXISTS solve_language TEXT NOT NULL DEFAULT '';

UPDATE interview_prep_tasks
SET supported_languages = ARRAY[language]
WHERE COALESCE(array_length(supported_languages, 1), 0) = 0;

UPDATE interview_prep_sessions s
SET solve_language = t.language
FROM interview_prep_tasks t
WHERE s.task_id = t.id
  AND s.solve_language = '';

CREATE INDEX IF NOT EXISTS idx_interview_prep_tasks_company_tag
  ON interview_prep_tasks (company_tag);

-- +goose Down
DROP INDEX IF EXISTS idx_interview_prep_tasks_company_tag;

ALTER TABLE interview_prep_sessions
  DROP COLUMN IF EXISTS solve_language;

ALTER TABLE interview_prep_tasks
  DROP COLUMN IF EXISTS supported_languages,
  DROP COLUMN IF EXISTS company_tag;
