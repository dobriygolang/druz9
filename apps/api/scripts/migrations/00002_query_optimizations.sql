-- +goose Up
-- +goose StatementBegin
CREATE INDEX IF NOT EXISTS idx_event_participants_event_status
  ON event_participants(event_id, status);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_participants_event_status;
-- +goose StatementEnd
