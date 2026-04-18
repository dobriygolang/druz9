-- +goose Up
-- +goose StatementBegin

-- Add a phase column to guild_wars to support weekly cron-driven phase
-- transitions: draft → active → champions_duel → resolved.
-- Existing rows (lazily bootstrapped demo wars) default to 'active'.

ALTER TABLE guild_wars ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'active';

-- Phase-aware index so the cron can batch-update by phase efficiently.
CREATE INDEX IF NOT EXISTS idx_guild_wars_phase ON guild_wars(phase) WHERE phase <> 'resolved';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_guild_wars_phase;
ALTER TABLE guild_wars DROP COLUMN IF EXISTS phase;
-- +goose StatementEnd
