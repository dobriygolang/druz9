-- +goose Up
CREATE TABLE events (
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
  series_id UUID,
  repeat_rule TEXT NOT NULL DEFAULT 'none' CHECK (repeat_rule IN ('none', 'daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_scheduled_at ON events(scheduled_at);
CREATE INDEX idx_events_series_id ON events(series_id);

CREATE TABLE event_participants (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);
CREATE INDEX idx_event_participants_event_created_at ON event_participants(event_id, created_at);
CREATE INDEX idx_event_participants_event_status ON event_participants(event_id, status);

CREATE TABLE podcasts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  listens_count BIGINT NOT NULL DEFAULT 0,
  file_name TEXT,
  content_type INT NOT NULL DEFAULT 0 CHECK (content_type BETWEEN 0 AND 4),
  object_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_podcasts_created_at ON podcasts(created_at DESC);

CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  vacancy_url TEXT,
  description TEXT NOT NULL,
  experience TEXT,
  location TEXT,
  employment_type INT NOT NULL DEFAULT 0 CHECK (employment_type BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS podcasts;
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS events;
