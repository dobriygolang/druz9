-- +goose Up
-- +goose StatementBegin
CREATE INDEX IF NOT EXISTS idx_event_participants_event_status
  ON event_participants(event_id, status);

CREATE INDEX IF NOT EXISTS idx_room_members_room_joined_at
  ON room_members(room_id, joined_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_room_members_room_joined_at;
DROP INDEX IF EXISTS idx_event_participants_event_status;
-- +goose StatementEnd
