-- +goose Up
-- +goose StatementBegin
ALTER TABLE code_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'algorithm_practice',
  ADD COLUMN IF NOT EXISTS execution_profile TEXT NOT NULL DEFAULT 'pure',
  ADD COLUMN IF NOT EXISTS fixture_files TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS readable_paths TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS writable_paths TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_hosts TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_ports INT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mock_endpoints TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS writable_temp_dir BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE code_tasks
SET
  task_type = COALESCE(NULLIF(task_type, ''), 'algorithm_practice'),
  execution_profile = COALESCE(NULLIF(execution_profile, ''), 'pure')
WHERE TRUE;

ALTER TABLE code_tasks
  ADD CONSTRAINT code_tasks_task_type_chk
    CHECK (task_type IN ('arena_duel', 'algorithm_practice', 'file_parsing', 'api_json', 'interview_practice', 'code_editor')),
  ADD CONSTRAINT code_tasks_execution_profile_chk
    CHECK (execution_profile IN ('pure', 'file_io', 'http_client', 'interview_realistic'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE code_tasks
  DROP CONSTRAINT IF EXISTS code_tasks_task_type_chk,
  DROP CONSTRAINT IF EXISTS code_tasks_execution_profile_chk,
  DROP COLUMN IF EXISTS task_type,
  DROP COLUMN IF EXISTS execution_profile,
  DROP COLUMN IF EXISTS fixture_files,
  DROP COLUMN IF EXISTS readable_paths,
  DROP COLUMN IF EXISTS writable_paths,
  DROP COLUMN IF EXISTS allowed_hosts,
  DROP COLUMN IF EXISTS allowed_ports,
  DROP COLUMN IF EXISTS mock_endpoints,
  DROP COLUMN IF EXISTS writable_temp_dir;
-- +goose StatementEnd
