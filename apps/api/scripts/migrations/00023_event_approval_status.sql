-- +goose Up
-- +goose StatementBegin
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Backfill: all existing events are approved.
UPDATE events SET status = 'approved' WHERE status = '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_events_status;
ALTER TABLE events DROP COLUMN IF EXISTS status;
-- +goose StatementEnd
