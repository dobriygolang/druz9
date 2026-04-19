-- user_premium: tracks active premium subscriptions sourced from Boosty.
-- One row per user — upsert on re-link/re-check.
CREATE TABLE IF NOT EXISTS user_premium (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    source       TEXT        NOT NULL DEFAULT 'boosty', -- 'boosty' | 'manual'
    boosty_email TEXT,                                  -- email the user claimed on Boosty
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    starts_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_premium_expires
    ON user_premium(expires_at) WHERE active = TRUE;
