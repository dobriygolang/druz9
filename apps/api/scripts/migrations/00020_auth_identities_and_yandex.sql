-- +goose Up
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_identities_provider_check CHECK (provider IN ('telegram', 'yandex')),
  CONSTRAINT user_identities_provider_uid_unique UNIQUE (provider, provider_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_identities_primary_per_user_idx
  ON user_identities(user_id)
  WHERE is_primary = TRUE;

INSERT INTO user_identities (
  id,
  user_id,
  provider,
  provider_user_id,
  username,
  email,
  avatar_url,
  is_primary,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'telegram',
  u.telegram_id::text,
  COALESCE(u.telegram_username, ''),
  '',
  COALESCE(u.telegram_avatar_url, ''),
  TRUE,
  NOW(),
  NOW()
FROM users u
WHERE u.telegram_id IS NOT NULL
  AND u.telegram_id <> 0
ON CONFLICT (provider, provider_user_id) DO UPDATE SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

UPDATE users u
SET username = COALESCE(NULLIF(u.username, ''), NULLIF(u.telegram_username, ''), '')
WHERE COALESCE(NULLIF(u.username, ''), '') = '';

ALTER TABLE users
  DROP COLUMN IF EXISTS login,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS telegram_id,
  DROP COLUMN IF EXISTS telegram_username,
  DROP COLUMN IF EXISTS telegram_avatar_url;

-- +goose Down
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_avatar_url TEXT;

UPDATE users u
SET
  telegram_id = src.telegram_id,
  telegram_username = src.telegram_username,
  telegram_avatar_url = src.telegram_avatar_url
FROM (
  SELECT
    ui.user_id,
    NULLIF(ui.provider_user_id, '')::BIGINT AS telegram_id,
    NULLIF(ui.username, '') AS telegram_username,
    NULLIF(ui.avatar_url, '') AS telegram_avatar_url
  FROM user_identities ui
  WHERE ui.provider = 'telegram'
) AS src
WHERE src.user_id = u.id;

DROP INDEX IF EXISTS user_identities_primary_per_user_idx;
DROP TABLE IF EXISTS user_identities;

ALTER TABLE users
  DROP COLUMN IF EXISTS username;
