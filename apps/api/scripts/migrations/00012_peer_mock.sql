-- +goose Up
-- +goose StatementBegin

-- Peer-to-peer mock interviews: one user offers a slot, another books
-- it. See Round 5 plan "Peer Mock Interview System" for the full spec.

CREATE TABLE IF NOT EXISTS mock_slots (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at       TIMESTAMPTZ  NOT NULL,
  ends_at         TIMESTAMPTZ  NOT NULL,
  -- 1=algo 2=sd 3=behavioral 4=full (mirrors SlotType enum).
  type            SMALLINT     NOT NULL DEFAULT 1,
  -- 1=junior 2=mid 3=senior.
  level           SMALLINT     NOT NULL DEFAULT 2,
  price_gold      INT          NOT NULL DEFAULT 0,
  -- 1=open 2=booked 3=completed 4=cancelled.
  status          SMALLINT     NOT NULL DEFAULT 1,
  note            TEXT         NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT mock_slots_time_ordered CHECK (ends_at > starts_at),
  CONSTRAINT mock_slots_price_nonneg CHECK (price_gold >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mock_slots_status_starts   ON mock_slots(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_mock_slots_interviewer     ON mock_slots(interviewer_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS mock_bookings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         UUID         NOT NULL UNIQUE REFERENCES mock_slots(id) ON DELETE CASCADE,
  interviewee_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id         UUID,
  -- 1=scheduled 2=in_progress 3=completed 4=cancelled_by_booker
  -- 5=cancelled_by_offerer 6=no_show_booker 7=no_show_offerer.
  status          SMALLINT     NOT NULL DEFAULT 1,
  price_gold      INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  CONSTRAINT mock_bookings_price_nonneg CHECK (price_gold >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mock_bookings_interviewee ON mock_bookings(interviewee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mock_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        NOT NULL REFERENCES mock_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL,
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mock_reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  UNIQUE (booking_id, reviewer_id)
);

-- Per-user reliability score (0..100). Starts at 100 for new users and
-- drops when penalties fire. The penalty engine is a background job
-- (not this migration) that runs on the cadence described in the plan.
CREATE TABLE IF NOT EXISTS user_reliability (
  user_id          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  score            SMALLINT    NOT NULL DEFAULT 100,
  penalty_count    INT         NOT NULL DEFAULT 0,
  last_penalty_at  TIMESTAMPTZ,
  ban_until        TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_reliability_score_range CHECK (score BETWEEN 0 AND 100)
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS mock_reviews;
DROP TABLE IF EXISTS mock_bookings;
DROP TABLE IF EXISTS mock_slots;
DROP TABLE IF EXISTS user_reliability;
-- +goose StatementEnd
