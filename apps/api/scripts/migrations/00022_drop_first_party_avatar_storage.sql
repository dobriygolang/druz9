-- +goose Up
UPDATE users
SET avatar_url = ''
WHERE COALESCE(avatar_url, '') <> '';

ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url;

-- +goose Down
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
