-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
  ALTER COLUMN telegram_id DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS telegram_avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_lower_unique
  ON users (LOWER(login))
  WHERE login IS NOT NULL AND login != '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_login_lower_unique;

ALTER TABLE users
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS login,
  DROP COLUMN IF EXISTS telegram_avatar_url;

UPDATE users
SET telegram_id = 0
WHERE telegram_id IS NULL;

ALTER TABLE users
  ALTER COLUMN telegram_id SET NOT NULL;
-- +goose StatementEnd