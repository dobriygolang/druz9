-- +goose Up
-- +goose StatementBegin
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_avatar_url TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE users
  DROP COLUMN IF EXISTS telegram_avatar_url;
-- +goose StatementEnd