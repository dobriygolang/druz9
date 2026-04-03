-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  first_name TEXT,
  last_name TEXT,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_workplace TEXT NOT NULL DEFAULT '',
  primary_provider TEXT NOT NULL DEFAULT '' CHECK (primary_provider IN ('', 'telegram', 'yandex')),
  yandex_id TEXT,
  yandex_login TEXT,
  yandex_email TEXT,
  yandex_avatar_url TEXT,
  telegram_id BIGINT,
  telegram_username TEXT,
  telegram_avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_username_lower_unique
  ON users (LOWER(username))
  WHERE username IS NOT NULL AND username <> '';

CREATE UNIQUE INDEX idx_users_yandex_id_unique
  ON users (yandex_id)
  WHERE yandex_id IS NOT NULL AND yandex_id <> '';

CREATE UNIQUE INDEX idx_users_telegram_id_unique
  ON users (telegram_id)
  WHERE telegram_id IS NOT NULL;

CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

CREATE TABLE geo (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  country TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE INDEX geo_region_idx ON geo(region);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- +goose Down
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS geo;
DROP INDEX IF EXISTS idx_users_is_admin;
DROP INDEX IF EXISTS idx_users_telegram_id_unique;
DROP INDEX IF EXISTS idx_users_yandex_id_unique;
DROP INDEX IF EXISTS idx_users_username_lower_unique;
DROP TABLE IF EXISTS users;
