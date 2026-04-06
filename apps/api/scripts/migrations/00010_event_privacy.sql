-- +goose Up
ALTER TABLE events
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- +goose Down
ALTER TABLE events DROP COLUMN IF EXISTS is_public;
