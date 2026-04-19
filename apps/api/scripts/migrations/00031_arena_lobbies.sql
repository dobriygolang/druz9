-- +goose Up
-- +goose StatementBegin

-- ADR-004 — 2v2 lobby formation. Two players join a lobby (via invite
-- code), then enqueue together; the matchmaker pairs the lobby with
-- another lobby of similar ELO and starts a team_2v2 match.
CREATE TABLE IF NOT EXISTS arena_lobbies (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    mode         TEXT         NOT NULL DEFAULT 'team_2v2'
                              CHECK (mode IN ('team_2v2','team_3v3')),
    invite_code  TEXT         NOT NULL UNIQUE,
    created_by   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT         NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','queued','matched','expired')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '15 min'
);

CREATE TABLE IF NOT EXISTS arena_lobby_members (
    lobby_id  UUID         NOT NULL REFERENCES arena_lobbies(id) ON DELETE CASCADE,
    user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lobby_id, user_id)
);

-- Matchmaker hot path: open lobbies grouped by mode + ELO bucket.
CREATE INDEX IF NOT EXISTS idx_arena_lobbies_open
    ON arena_lobbies(mode, status, created_at)
    WHERE status IN ('open','queued');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_arena_lobbies_open;
DROP TABLE IF EXISTS arena_lobby_members;
DROP TABLE IF EXISTS arena_lobbies;
-- +goose StatementEnd
