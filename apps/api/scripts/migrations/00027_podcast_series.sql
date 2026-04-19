-- +goose Up
-- +goose StatementBegin

-- ADR-005 — Podcast Series + Featured editorial flag.
--
-- Series is a named collection (e.g. "DDIA Reading Club"); episodes link
-- via podcasts.series_id with episode_number for ordering. Featured is a
-- timestamp so the editorial team can schedule "make this featured for a
-- week" by combining featured_at + a future cleanup task.
CREATE TABLE IF NOT EXISTS podcast_series (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT         NOT NULL UNIQUE,
    title           TEXT         NOT NULL,
    description     TEXT         NOT NULL DEFAULT '',
    cover_ref       TEXT         NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE podcasts
    ADD COLUMN IF NOT EXISTS series_id      UUID REFERENCES podcast_series(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS episode_number INT,
    ADD COLUMN IF NOT EXISTS featured_at    TIMESTAMPTZ;

-- Featured-tab listing query: ORDER BY featured_at DESC NULLS LAST.
CREATE INDEX IF NOT EXISTS idx_podcasts_featured_at ON podcasts(featured_at DESC NULLS LAST);
-- Series detail page: episodes ordered.
CREATE INDEX IF NOT EXISTS idx_podcasts_series_episode ON podcasts(series_id, episode_number) WHERE series_id IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_podcasts_series_episode;
DROP INDEX IF EXISTS idx_podcasts_featured_at;
ALTER TABLE podcasts
    DROP COLUMN IF EXISTS featured_at,
    DROP COLUMN IF EXISTS episode_number,
    DROP COLUMN IF EXISTS series_id;
DROP TABLE IF EXISTS podcast_series;
-- +goose StatementEnd
