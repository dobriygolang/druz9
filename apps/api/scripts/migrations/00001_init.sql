-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_workplace TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

CREATE TABLE IF NOT EXISTS geo (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  country TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS geo_region_idx ON geo(region);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  place_label TEXT NOT NULL,
  description TEXT,
  meeting_link TEXT,
  region TEXT,
  country TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_scheduled_at ON events(scheduled_at);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_created_at
  ON event_participants(event_id, created_at);

CREATE TABLE IF NOT EXISTS podcasts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  listens_count BIGINT NOT NULL DEFAULT 0,
  file_name TEXT,
  content_type TEXT,
  object_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  vacancy_url TEXT,
  description TEXT NOT NULL,
  experience TEXT,
  location TEXT,
  employment_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_kind ON rooms(kind);

CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);

CREATE TABLE IF NOT EXISTS room_media_state (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  media_url TEXT,
  paused BOOLEAN NOT NULL DEFAULT TRUE,
  current_time_seconds INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS room_media_state;
DROP TABLE IF EXISTS room_members;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS podcasts;
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS geo;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
