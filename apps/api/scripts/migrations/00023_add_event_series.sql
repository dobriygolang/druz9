-- +goose Up
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS series_id UUID NULL,
  ADD COLUMN IF NOT EXISTS repeat_rule TEXT NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_events_series_id ON events (series_id);

-- +goose Down
DROP INDEX IF EXISTS idx_events_series_id;

ALTER TABLE events
  DROP COLUMN IF EXISTS repeat_rule,
  DROP COLUMN IF EXISTS series_id;
