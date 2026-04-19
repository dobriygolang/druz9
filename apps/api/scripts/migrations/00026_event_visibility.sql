-- +goose Up
-- +goose StatementBegin

-- ADR-004 — Refine event scope with explicit visibility + guild link.
-- Existing rows: is_public=TRUE → 'public'; is_public=FALSE → 'private'
-- (the GUILD_ONLY mode lights up only when callers start setting it).
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS visibility   TEXT
        NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public','guild_only','private')),
    ADD COLUMN IF NOT EXISTS guild_id     UUID,
    ADD COLUMN IF NOT EXISTS system_kind  TEXT;

UPDATE events SET visibility = 'private' WHERE is_public = FALSE AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_guild ON events(guild_id) WHERE guild_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_system ON events(system_kind) WHERE system_kind IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_events_system;
DROP INDEX IF EXISTS idx_events_guild;
DROP INDEX IF EXISTS idx_events_visibility;
ALTER TABLE events
    DROP COLUMN IF EXISTS system_kind,
    DROP COLUMN IF EXISTS guild_id,
    DROP COLUMN IF EXISTS visibility;
-- +goose StatementEnd
