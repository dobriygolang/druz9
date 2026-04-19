-- interview_live_sessions stores completed AI-mentor chat sessions.
-- transcript is a JSON array of {role, content} objects (client-side history).
-- evaluation holds the AI-generated feedback returned at session end.
-- front_id is nullable — set when the session was started from a guild war front.

CREATE TABLE IF NOT EXISTS interview_live_sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    focus        TEXT        NOT NULL DEFAULT 'default',
    front_id     UUID        REFERENCES guild_war_fronts(id) ON DELETE SET NULL,
    transcript   JSONB       NOT NULL DEFAULT '[]',
    code         TEXT        NOT NULL DEFAULT '',
    evaluation   TEXT,
    duration_s   INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ils_user_id    ON interview_live_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ils_created_at ON interview_live_sessions(created_at DESC);
