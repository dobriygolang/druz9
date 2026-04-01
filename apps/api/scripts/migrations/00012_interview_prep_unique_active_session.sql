-- +goose Up
CREATE UNIQUE INDEX IF NOT EXISTS uq_interview_prep_active_session
ON interview_prep_sessions (user_id, task_id)
WHERE status = 'active';

-- +goose Down
DROP INDEX IF EXISTS uq_interview_prep_active_session;