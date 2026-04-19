-- guild_war_challenges: explicit guild-to-guild war declarations.
-- from_guild_id challenges to_guild_id; target accepts or declines within 24 h.
-- +goose Up
CREATE TABLE IF NOT EXISTS guild_war_challenges (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    from_guild_id UUID        NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    from_name     TEXT        NOT NULL,
    to_guild_id   UUID        NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    status        TEXT        NOT NULL DEFAULT 'pending', -- pending | accepted | declined | expired
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_gwch_to_guild   ON guild_war_challenges(to_guild_id, status);
CREATE INDEX IF NOT EXISTS idx_gwch_from_guild ON guild_war_challenges(from_guild_id, status);

-- guild_war_matchmaking: guilds queued for auto-pairing.
-- When a second guild joins, both are immediately matched into an active war.
CREATE TABLE IF NOT EXISTS guild_war_matchmaking (
    guild_id     UUID        PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
    guild_name   TEXT        NOT NULL,
    member_count INT         NOT NULL DEFAULT 1,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS guild_war_matchmaking;
DROP INDEX IF EXISTS idx_gwch_from_guild;
DROP INDEX IF EXISTS idx_gwch_to_guild;
DROP TABLE IF EXISTS guild_war_challenges;
