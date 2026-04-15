-- +goose Up
ALTER TABLE users
  ADD COLUMN goal_kind    TEXT NOT NULL DEFAULT 'general_growth',
  ADD COLUMN goal_company TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE users
  DROP COLUMN IF EXISTS goal_kind,
  DROP COLUMN IF EXISTS goal_company;
