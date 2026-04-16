-- +goose Up

-- idx_circle_members_circle duplicates the PK (circle_id, user_id) which already
-- covers lookups by circle_id. Removing saves disk space and INSERT overhead.
DROP INDEX IF EXISTS idx_circle_members_circle;

-- yandex_login and yandex_email are written during OAuth but never read anywhere.
ALTER TABLE users DROP COLUMN IF EXISTS yandex_login;
ALTER TABLE users DROP COLUMN IF EXISTS yandex_email;

-- answer_text in interview_practice_sessions is always set to '' and never read.
ALTER TABLE interview_practice_sessions DROP COLUMN IF EXISTS answer_text;

-- answer_text in interview_mock_rounds is always set to '' and never read.
ALTER TABLE interview_mock_rounds DROP COLUMN IF EXISTS answer_text;

-- +goose Down
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_login TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_email TEXT NOT NULL DEFAULT '';
ALTER TABLE interview_practice_sessions ADD COLUMN IF NOT EXISTS answer_text TEXT NOT NULL DEFAULT '';
ALTER TABLE interview_mock_rounds ADD COLUMN IF NOT EXISTS answer_text TEXT NOT NULL DEFAULT '';
