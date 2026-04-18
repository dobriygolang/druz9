-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY,
  telegram_chat_id BIGINT,

  duels_enabled BOOLEAN NOT NULL DEFAULT true,
  progress_enabled BOOLEAN NOT NULL DEFAULT true,
  guilds_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_challenge_enabled BOOLEAN NOT NULL DEFAULT false,

  quiet_hours_start SMALLINT NOT NULL DEFAULT 23,
  quiet_hours_end SMALLINT NOT NULL DEFAULT 8,
  timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',

  engagement_paused BOOLEAN NOT NULL DEFAULT false,
  last_engagement_sent_at TIMESTAMPTZ,
  consecutive_ignored INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_notification_settings (
  user_id UUID NOT NULL,
  guild_id UUID NOT NULL,

  events_enabled BOOLEAN NOT NULL DEFAULT true,
  activity_enabled BOOLEAN NOT NULL DEFAULT true,
  digest_enabled BOOLEAN NOT NULL DEFAULT true,
  muted BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_sent
  ON notifications (user_id, sent_at)
  WHERE sent_at IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_notifications_user_sent;
DROP TABLE IF EXISTS guild_notification_settings;
DROP TABLE IF EXISTS user_notification_settings;
-- +goose StatementEnd
