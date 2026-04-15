-- +goose Up

-- Daily challenge AI review scores (persisted from frontend AI review).
CREATE TABLE IF NOT EXISTS daily_challenge_results (
    user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_date DATE    NOT NULL,
    task_id        UUID    NOT NULL,
    ai_score       INT     NOT NULL DEFAULT 0,
    submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_dcr_date_score
    ON daily_challenge_results(challenge_date, ai_score DESC);

-- Blind review: user reviews anonymous code, AI evaluates quality.
CREATE TABLE IF NOT EXISTS blind_review_sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_review_id UUID        NOT NULL,
    task_id          UUID        NOT NULL,
    source_code      TEXT        NOT NULL DEFAULT '',
    source_language  TEXT        NOT NULL DEFAULT '',
    user_review      TEXT        NOT NULL DEFAULT '',
    ai_score         INT         NOT NULL DEFAULT 0,
    ai_feedback      TEXT        NOT NULL DEFAULT '',
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brs_user
    ON blind_review_sessions(user_id, submitted_at DESC);

-- Personal best records for speed-run mode.
CREATE TABLE IF NOT EXISTS user_task_records (
    user_id         UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id         UUID    NOT NULL,
    best_time_ms    BIGINT  NOT NULL,
    best_ai_score   INT     NOT NULL DEFAULT 0,
    attempts        INT     NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, task_id)
);

-- Weekly boss challenge entries (one best per user per week).
CREATE TABLE IF NOT EXISTS weekly_challenge_entries (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_key      TEXT        NOT NULL,
    task_id       UUID        NOT NULL,
    ai_score      INT         NOT NULL DEFAULT 0,
    solve_time_ms BIGINT      NOT NULL DEFAULT 0,
    code          TEXT        NOT NULL DEFAULT '',
    language      TEXT        NOT NULL DEFAULT '',
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_wce_week_score
    ON weekly_challenge_entries(week_key, ai_score DESC, solve_time_ms ASC);

-- +goose Down

DROP TABLE IF EXISTS weekly_challenge_entries;
DROP TABLE IF EXISTS user_task_records;
DROP TABLE IF EXISTS blind_review_sessions;
DROP TABLE IF EXISTS daily_challenge_results;
