-- +goose Up
ALTER TABLE code_rooms
  ADD COLUMN language INT NOT NULL DEFAULT 4 CHECK (language BETWEEN 0 AND 8);

CREATE TABLE code_duel_editor_states (
  room_id UUID NOT NULL REFERENCES code_rooms(id) ON DELETE CASCADE,
  actor_key TEXT NOT NULL CHECK (octet_length(actor_key) BETWEEN 1 AND 128),
  code TEXT NOT NULL DEFAULT '',
  language INT NOT NULL DEFAULT 4 CHECK (language BETWEEN 0 AND 8),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, actor_key)
);

CREATE INDEX idx_code_duel_editor_states_updated_at
  ON code_duel_editor_states(room_id, updated_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_code_duel_editor_states_updated_at;
DROP TABLE IF EXISTS code_duel_editor_states;
ALTER TABLE code_rooms DROP COLUMN IF EXISTS language;
