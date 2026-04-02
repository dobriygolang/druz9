-- +goose Up
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS primary_provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS yandex_id TEXT,
  ADD COLUMN IF NOT EXISTS yandex_login TEXT,
  ADD COLUMN IF NOT EXISTS yandex_email TEXT,
  ADD COLUMN IF NOT EXISTS yandex_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_avatar_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_primary_provider_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_primary_provider_check
      CHECK (primary_provider IN ('', 'telegram', 'yandex'));
  END IF;
END $$;

UPDATE users u
SET
  telegram_id = COALESCE(u.telegram_id, NULLIF(ui.provider_user_id, '')::BIGINT),
  telegram_username = COALESCE(NULLIF(u.telegram_username, ''), NULLIF(ui.username, ''), ''),
  telegram_avatar_url = COALESCE(NULLIF(u.telegram_avatar_url, ''), NULLIF(ui.avatar_url, ''), ''),
  primary_provider = CASE
    WHEN NULLIF(u.primary_provider, '') IS NOT NULL THEN u.primary_provider
    WHEN ui.is_primary THEN 'telegram'
    ELSE u.primary_provider
  END
FROM user_identities ui
WHERE ui.user_id = u.id
  AND ui.provider = 'telegram';

UPDATE users u
SET
  yandex_id = COALESCE(NULLIF(u.yandex_id, ''), NULLIF(ui.provider_user_id, ''), ''),
  yandex_login = COALESCE(NULLIF(u.yandex_login, ''), NULLIF(ui.username, ''), ''),
  yandex_email = COALESCE(NULLIF(u.yandex_email, ''), NULLIF(ui.email, ''), ''),
  yandex_avatar_url = COALESCE(NULLIF(u.yandex_avatar_url, ''), NULLIF(ui.avatar_url, ''), ''),
  primary_provider = CASE
    WHEN NULLIF(u.primary_provider, '') IS NOT NULL THEN u.primary_provider
    WHEN ui.is_primary THEN 'yandex'
    ELSE u.primary_provider
  END
FROM user_identities ui
WHERE ui.user_id = u.id
  AND ui.provider = 'yandex';

UPDATE users
SET
  username = COALESCE(NULLIF(username, ''), NULLIF(telegram_username, ''), NULLIF(yandex_login, ''), ''),
  avatar_url = COALESCE(NULLIF(avatar_url, ''), NULLIF(yandex_avatar_url, ''), NULLIF(telegram_avatar_url, ''), ''),
  primary_provider = CASE
    WHEN NULLIF(primary_provider, '') IS NOT NULL THEN primary_provider
    WHEN NULLIF(yandex_id, '') IS NOT NULL THEN 'yandex'
    WHEN telegram_id IS NOT NULL THEN 'telegram'
    ELSE ''
  END;

WITH ranked AS (
  SELECT
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at, id) AS rn
  FROM users
  WHERE NULLIF(username, '') IS NOT NULL
)
UPDATE users u
SET username = ranked.username || '_' || SUBSTRING(u.id::text, 1, 8)
FROM ranked
WHERE ranked.id = u.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS user_identities_primary_per_user_idx;
DROP TABLE IF EXISTS user_identities;

DROP INDEX IF EXISTS idx_users_login_lower_unique;

ALTER TABLE users
  DROP COLUMN IF EXISTS login,
  DROP COLUMN IF EXISTS password_hash;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique
  ON users (LOWER(username))
  WHERE username IS NOT NULL AND username != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_yandex_id_unique
  ON users (yandex_id)
  WHERE yandex_id IS NOT NULL AND yandex_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id_unique
  ON users (telegram_id)
  WHERE telegram_id IS NOT NULL;

-- +goose Down
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

INSERT INTO user_identities (
  id, user_id, provider, provider_user_id, username, email, avatar_url, is_primary, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id,
  'telegram',
  telegram_id::text,
  COALESCE(telegram_username, ''),
  '',
  COALESCE(telegram_avatar_url, ''),
  primary_provider = 'telegram',
  NOW(),
  NOW()
FROM users
WHERE telegram_id IS NOT NULL
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO user_identities (
  id, user_id, provider, provider_user_id, username, email, avatar_url, is_primary, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id,
  'yandex',
  yandex_id,
  COALESCE(yandex_login, ''),
  COALESCE(yandex_email, ''),
  COALESCE(yandex_avatar_url, ''),
  primary_provider = 'yandex',
  NOW(),
  NOW()
FROM users
WHERE NULLIF(yandex_id, '') IS NOT NULL
ON CONFLICT (provider, provider_user_id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS user_identities_primary_per_user_idx
  ON user_identities(user_id)
  WHERE is_primary = TRUE;

DROP INDEX IF EXISTS idx_users_telegram_id_unique;
DROP INDEX IF EXISTS idx_users_yandex_id_unique;
DROP INDEX IF EXISTS idx_users_username_lower_unique;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_primary_provider_check;

ALTER TABLE users
  DROP COLUMN IF EXISTS primary_provider,
  DROP COLUMN IF EXISTS yandex_id,
  DROP COLUMN IF EXISTS yandex_login,
  DROP COLUMN IF EXISTS yandex_email,
  DROP COLUMN IF EXISTS yandex_avatar_url;
