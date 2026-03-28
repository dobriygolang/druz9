-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS seed_runs (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS seed_runs;
-- +goose StatementEnd
