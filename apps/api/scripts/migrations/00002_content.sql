-- +goose Up
-- Content & social: events, podcasts, referrals, inbox, friends, friend_challenges.
-- Consolidated from original migrations 00002, 00009, 00010, 00017, 00023, 00028, 00029, 00033 (rename), 00035, 00038 (CHECKs).

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
  scheduled_at TIMESTAMPTZ,
  series_id UUID,
  repeat_rule TEXT NOT NULL DEFAULT 'none' CHECK (repeat_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  guild_id UUID,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_title_len CHECK (char_length(title) <= 200),
  CONSTRAINT events_description_len CHECK (char_length(COALESCE(description, '')) <= 4000)
);

CREATE INDEX idx_events_scheduled_at ON events(scheduled_at);
CREATE INDEX idx_events_series_id ON events(series_id);
CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_guild_id ON events(guild_id) WHERE guild_id IS NOT NULL;
CREATE INDEX idx_events_status ON events(status);

CREATE TABLE IF NOT EXISTS event_participants (
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

CREATE TABLE IF NOT EXISTS podcasts (
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
CREATE INDEX idx_podcasts_uploaded ON podcasts(created_at DESC)
  WHERE object_key IS NOT NULL AND object_key <> '';

CREATE TABLE IF NOT EXISTS referrals (
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

-- Inbox: threads + messages
CREATE TABLE IF NOT EXISTS inbox_threads (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind            SMALLINT     NOT NULL,
  subject         TEXT         NOT NULL,
  avatar          TEXT         NOT NULL DEFAULT '',
  preview         TEXT         NOT NULL DEFAULT '',
  unread_count    INT          NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  external_id     UUID,
  interactive     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT inbox_threads_subject_len CHECK (char_length(subject) <= 200),
  CONSTRAINT inbox_threads_preview_len CHECK (char_length(preview) <= 500)
);

CREATE INDEX idx_inbox_threads_user_last ON inbox_threads(user_id, last_message_at DESC);
CREATE INDEX idx_inbox_threads_external ON inbox_threads(external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inbox_messages (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID         NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
  sender_kind  SMALLINT     NOT NULL,
  sender_id    UUID,
  sender_name  TEXT         NOT NULL,
  body         TEXT         NOT NULL,
  read         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT inbox_messages_body_len CHECK (char_length(body) <= 4000)
);

CREATE INDEX idx_inbox_messages_thread_created ON inbox_messages(thread_id, created_at ASC);
CREATE INDEX idx_inbox_messages_unread ON inbox_messages(thread_id) WHERE read = FALSE;

-- Friendships (canonical-order symmetric)
CREATE TABLE IF NOT EXISTS friendships (
  user_a          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  a_favorite      BOOLEAN      NOT NULL DEFAULT FALSE,
  b_favorite      BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_a, user_b),
  CONSTRAINT friendships_canonical_order CHECK (user_a < user_b)
);

CREATE INDEX idx_friendships_user_b ON friendships(user_b);

CREATE TABLE IF NOT EXISTS friend_requests (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      TEXT         NOT NULL DEFAULT '',
  status       SMALLINT     NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  CONSTRAINT friend_requests_distinct CHECK (from_user_id <> to_user_id),
  CONSTRAINT friend_requests_message_len CHECK (char_length(message) <= 280)
);

CREATE UNIQUE INDEX idx_friend_requests_pending_pair
  ON friend_requests(from_user_id, to_user_id)
  WHERE status = 1;
CREATE INDEX idx_friend_requests_to ON friend_requests(to_user_id, status, created_at DESC);
CREATE INDEX idx_friend_requests_from ON friend_requests(from_user_id, status, created_at DESC);

-- Friend challenges
CREATE TABLE IF NOT EXISTS friend_challenges (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_title              TEXT         NOT NULL,
  task_topic              TEXT         NOT NULL,
  task_difficulty         SMALLINT     NOT NULL,
  task_ref                TEXT         NOT NULL DEFAULT '',
  note                    TEXT         NOT NULL DEFAULT '',
  status                  SMALLINT     NOT NULL DEFAULT 1,
  challenger_submitted_at TIMESTAMPTZ,
  challenger_time_ms      INT,
  challenger_score        INT,
  opponent_submitted_at   TIMESTAMPTZ,
  opponent_time_ms        INT,
  opponent_score          INT,
  winner_id               UUID         REFERENCES users(id) ON DELETE SET NULL,
  deadline_at             TIMESTAMPTZ  NOT NULL,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  CONSTRAINT friend_challenges_distinct_parties CHECK (challenger_id <> opponent_id),
  CONSTRAINT friend_challenges_challenger_score_range CHECK (
    challenger_score IS NULL OR (challenger_score BETWEEN 0 AND 5)
  ),
  CONSTRAINT friend_challenges_opponent_score_range CHECK (
    opponent_score IS NULL OR (opponent_score BETWEEN 0 AND 5)
  ),
  CONSTRAINT friend_challenges_note_len CHECK (char_length(note) <= 400),
  CONSTRAINT friend_challenges_task_title_len CHECK (char_length(task_title) <= 200)
);

CREATE INDEX idx_fchallenges_opponent_status
  ON friend_challenges(opponent_id, status, created_at DESC);
CREATE INDEX idx_fchallenges_challenger_status
  ON friend_challenges(challenger_id, status, created_at DESC);
CREATE INDEX idx_fchallenges_deadline_active
  ON friend_challenges(deadline_at)
  WHERE status IN (1, 2);

-- +goose Down
DROP TABLE IF EXISTS friend_challenges;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS inbox_messages;
DROP TABLE IF EXISTS inbox_threads;
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS podcasts;
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS events;
