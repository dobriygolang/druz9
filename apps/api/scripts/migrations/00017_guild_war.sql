-- +goose Up
-- +goose StatementBegin

-- Wave B.5 — persistent Guild War tables. Minimum viable schema that
-- captures the core "fronts with round counters fed by user
-- contributions" loop; schedule phases and territory persistence are
-- layered in once the weekly-cron job exists.

CREATE TABLE IF NOT EXISTS guild_wars (
    id              UUID        PRIMARY KEY,
    week_number     INT         NOT NULL DEFAULT 0,
    our_guild_id    UUID        NOT NULL,
    their_guild_name TEXT        NOT NULL DEFAULT '',
    their_guild_id  UUID,
    status          TEXT        NOT NULL DEFAULT 'active', -- active | resolved | cancelled
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at         TIMESTAMPTZ NOT NULL,
    resolved_winner TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- We only care about "the currently active war for this guild" — a
-- partial unique constraint guards against parallel starts.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_guild_war_active_per_guild
    ON guild_wars(our_guild_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS guild_war_fronts (
    id            UUID        PRIMARY KEY,
    war_id        UUID        NOT NULL REFERENCES guild_wars(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    our_rounds    INT         NOT NULL DEFAULT 0,
    their_rounds  INT         NOT NULL DEFAULT 0,
    captured_by   TEXT        NOT NULL DEFAULT '',  -- ''|ours|theirs
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_war_fronts_war ON guild_war_fronts(war_id, sort_order);

CREATE TABLE IF NOT EXISTS guild_war_contributions (
    id            UUID        PRIMARY KEY,
    war_id        UUID        NOT NULL REFERENCES guild_wars(id) ON DELETE CASCADE,
    front_id      UUID        NOT NULL REFERENCES guild_war_fronts(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL,
    guild_id      UUID        NOT NULL,
    rounds        INT         NOT NULL,
    contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_war_contrib_front ON guild_war_contributions(front_id, contributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_war_contrib_user  ON guild_war_contributions(user_id, contributed_at DESC);

-- Territories persist across wars — a guild that captured "Graphs
-- Bastion" last week keeps the buff until someone takes it off them.
CREATE TABLE IF NOT EXISTS guild_territories (
    id           UUID        PRIMARY KEY,
    guild_id     UUID        NOT NULL,
    name         TEXT        NOT NULL,
    buff         TEXT        NOT NULL DEFAULT '',  -- free-form buff key, client renders
    captured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_territories_guild ON guild_territories(guild_id, captured_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS guild_territories;
DROP TABLE IF EXISTS guild_war_contributions;
DROP TABLE IF EXISTS guild_war_fronts;
DROP TABLE IF EXISTS guild_wars;
-- +goose StatementEnd
