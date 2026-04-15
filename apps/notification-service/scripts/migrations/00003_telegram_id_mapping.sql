-- +goose Up
-- +goose StatementBegin
ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notification_settings_telegram_id
  ON user_notification_settings (telegram_id) WHERE telegram_id IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_notification_settings_telegram_id;
ALTER TABLE user_notification_settings DROP COLUMN IF EXISTS telegram_id;
-- +goose StatementEnd
