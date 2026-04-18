-- +goose Up
-- Core: extensions, users, sessions, geo, seed_runs.
-- Consolidated from original migrations 00001, 00005, 00018, 00022, 00038 (users CHECKs).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
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
  goal_kind TEXT NOT NULL DEFAULT 'general_growth',
  goal_company TEXT NOT NULL DEFAULT '',
  profile_frame TEXT NOT NULL DEFAULT '',
  profile_title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_len CHECK (char_length(username) <= 30)
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

CREATE TABLE IF NOT EXISTS geo (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  country TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE INDEX geo_region_idx ON geo(region);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS seed_runs (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS seed_runs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS geo;
DROP TABLE IF EXISTS users;
