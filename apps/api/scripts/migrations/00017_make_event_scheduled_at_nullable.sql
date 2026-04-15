-- +goose Up
ALTER TABLE events
  ALTER COLUMN scheduled_at DROP NOT NULL;

-- +goose Down
DELETE FROM events WHERE scheduled_at IS NULL;

ALTER TABLE events
  ALTER COLUMN scheduled_at SET NOT NULL;
