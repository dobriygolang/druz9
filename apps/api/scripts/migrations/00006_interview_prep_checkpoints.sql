-- +goose Up
CREATE TABLE interview_prep_checkpoints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES interview_prep_tasks(id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE REFERENCES interview_prep_sessions(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  duration_seconds INT NOT NULL DEFAULT 900,
  attempts_used INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 2,
  score INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_prep_checkpoints_status_check CHECK (status IN ('active', 'passed', 'failed', 'expired'))
);

CREATE INDEX idx_interview_prep_checkpoints_user_status
  ON interview_prep_checkpoints(user_id, status, updated_at DESC);

CREATE INDEX idx_interview_prep_checkpoints_skill_status
  ON interview_prep_checkpoints(skill_key, status, updated_at DESC);

-- +goose Down
DROP TABLE IF EXISTS interview_prep_checkpoints;
