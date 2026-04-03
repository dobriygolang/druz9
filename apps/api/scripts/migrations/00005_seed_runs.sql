-- +goose Up
CREATE TABLE seed_runs (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS seed_runs;
