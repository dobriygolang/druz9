-- +goose Up

-- Tracks completion of daily/weekly missions.
CREATE TABLE IF NOT EXISTS user_mission_completions (
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_key TEXT         NOT NULL,
    period_key  TEXT         NOT NULL,   -- "2026-04-16" for daily, "2026-W16" for weekly
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, mission_key, period_key)
);

CREATE INDEX IF NOT EXISTS idx_umc_user_period ON user_mission_completions(user_id, period_key);

-- Season mission definitions (admin-managed).
CREATE TABLE IF NOT EXISTS season_missions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    season_number  SMALLINT    NOT NULL,
    mission_key    TEXT        NOT NULL,
    title          TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    target_value   INT         NOT NULL,
    xp_reward      INT         NOT NULL DEFAULT 0,
    category       TEXT        NOT NULL DEFAULT 'general',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_missions_season ON season_missions(season_number);

-- User progress toward season missions.
CREATE TABLE IF NOT EXISTS user_season_progress (
    user_id        UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_number  SMALLINT  NOT NULL,
    mission_id     UUID      NOT NULL REFERENCES season_missions(id) ON DELETE CASCADE,
    current_value  INT       NOT NULL DEFAULT 0,
    completed_at   TIMESTAMPTZ,
    PRIMARY KEY (user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_usp_user_season ON user_season_progress(user_id, season_number);

-- Profile rewards on users table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_frame TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_title TEXT NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE users DROP COLUMN IF EXISTS profile_title;
ALTER TABLE users DROP COLUMN IF EXISTS profile_frame;
DROP TABLE IF EXISTS user_season_progress;
DROP TABLE IF EXISTS season_missions;
DROP TABLE IF EXISTS user_mission_completions;
