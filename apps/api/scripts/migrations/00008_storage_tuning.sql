-- +goose Up
-- Historical migrations are left untouched on purpose. Applied migrations should not be rewritten.

ALTER TABLE code_rooms
  ALTER COLUMN code_revision TYPE INTEGER USING code_revision::integer;

ALTER TABLE code_submissions
  ALTER COLUMN duration_ms TYPE INTEGER USING duration_ms::integer,
  ALTER COLUMN passed_count TYPE SMALLINT USING passed_count::smallint,
  ALTER COLUMN total_count TYPE SMALLINT USING total_count::smallint;

ALTER TABLE code_task_test_cases
  ALTER COLUMN weight TYPE SMALLINT USING weight::smallint,
  ALTER COLUMN "order" TYPE SMALLINT USING "order"::smallint;

ALTER TABLE arena_matches
  ALTER COLUMN duration_seconds TYPE SMALLINT USING duration_seconds::smallint;

ALTER TABLE arena_match_players
  ALTER COLUMN best_runtime_ms TYPE INTEGER USING best_runtime_ms::integer;

ALTER TABLE arena_submissions
  ALTER COLUMN runtime_ms TYPE INTEGER USING runtime_ms::integer,
  ALTER COLUMN passed_count TYPE SMALLINT USING passed_count::smallint,
  ALTER COLUMN total_count TYPE SMALLINT USING total_count::smallint;

ALTER TABLE code_rooms
  ADD CONSTRAINT code_rooms_invite_code_octet_length_chk
    CHECK (octet_length(invite_code) BETWEEN 6 AND 32),
  ADD CONSTRAINT code_rooms_duel_topic_octet_length_chk
    CHECK (octet_length(COALESCE(duel_topic, '')) <= 64);

ALTER TABLE code_participants
  ADD CONSTRAINT code_participants_name_octet_length_chk
    CHECK (octet_length(name) BETWEEN 1 AND 80);

ALTER TABLE code_submissions
  ADD CONSTRAINT code_submissions_guest_name_octet_length_chk
    CHECK (octet_length(COALESCE(guest_name, '')) <= 80);

ALTER TABLE code_tasks
  ADD CONSTRAINT code_tasks_title_octet_length_chk
    CHECK (octet_length(title) BETWEEN 1 AND 160),
  ADD CONSTRAINT code_tasks_slug_octet_length_chk
    CHECK (octet_length(slug) BETWEEN 1 AND 80),
  ADD CONSTRAINT code_tasks_difficulty_octet_length_chk
    CHECK (octet_length(difficulty) BETWEEN 1 AND 32),
  ADD CONSTRAINT code_tasks_language_octet_length_chk
    CHECK (octet_length(language) BETWEEN 1 AND 16);

ALTER TABLE arena_matches
  ADD CONSTRAINT arena_matches_topic_octet_length_chk
    CHECK (octet_length(topic) <= 64),
  ADD CONSTRAINT arena_matches_difficulty_octet_length_chk
    CHECK (octet_length(difficulty) <= 32),
  ADD CONSTRAINT arena_matches_winner_reason_octet_length_chk
    CHECK (octet_length(winner_reason) <= 32);

ALTER TABLE arena_match_players
  ADD CONSTRAINT arena_match_players_display_name_octet_length_chk
    CHECK (octet_length(display_name) BETWEEN 1 AND 80);

DROP INDEX IF EXISTS idx_code_rooms_invite_code;
DROP INDEX IF EXISTS idx_code_rooms_status;
DROP INDEX IF EXISTS idx_code_rooms_created_at;
DROP INDEX IF EXISTS idx_code_rooms_updated_at;
DROP INDEX IF EXISTS idx_code_submissions_room_id;
DROP INDEX IF EXISTS idx_code_submissions_submitted_at;
DROP INDEX IF EXISTS idx_arena_matches_status_created_at;
DROP INDEX IF EXISTS idx_arena_matches_task_id;
DROP INDEX IF EXISTS idx_arena_match_players_user_id;
DROP INDEX IF EXISTS idx_arena_submissions_match_submitted_at;

CREATE INDEX IF NOT EXISTS idx_code_rooms_status_updated_at ON code_rooms(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_submissions_room_submitted_at ON code_submissions(room_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_matches_status_updated_at ON arena_matches(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_submissions_match_submitted_at ON arena_submissions(match_id, submitted_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_code_rooms_status_updated_at;
DROP INDEX IF EXISTS idx_code_submissions_room_submitted_at;
DROP INDEX IF EXISTS idx_arena_matches_status_updated_at;
DROP INDEX IF EXISTS idx_arena_submissions_match_submitted_at;

CREATE INDEX IF NOT EXISTS idx_code_rooms_invite_code ON code_rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_code_rooms_status ON code_rooms(status);
CREATE INDEX IF NOT EXISTS idx_code_rooms_created_at ON code_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_code_rooms_updated_at ON code_rooms(updated_at);
CREATE INDEX IF NOT EXISTS idx_code_submissions_room_id ON code_submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_submitted_at ON code_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_arena_matches_status_created_at ON arena_matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_matches_task_id ON arena_matches(task_id);
CREATE INDEX IF NOT EXISTS idx_arena_match_players_user_id ON arena_match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_submissions_match_submitted_at ON arena_submissions(match_id, submitted_at DESC);

ALTER TABLE arena_match_players DROP CONSTRAINT IF EXISTS arena_match_players_display_name_octet_length_chk;

ALTER TABLE arena_matches
  DROP CONSTRAINT IF EXISTS arena_matches_topic_octet_length_chk,
  DROP CONSTRAINT IF EXISTS arena_matches_difficulty_octet_length_chk,
  DROP CONSTRAINT IF EXISTS arena_matches_winner_reason_octet_length_chk;

ALTER TABLE code_tasks
  DROP CONSTRAINT IF EXISTS code_tasks_title_octet_length_chk,
  DROP CONSTRAINT IF EXISTS code_tasks_slug_octet_length_chk,
  DROP CONSTRAINT IF EXISTS code_tasks_difficulty_octet_length_chk,
  DROP CONSTRAINT IF EXISTS code_tasks_language_octet_length_chk;

ALTER TABLE code_submissions DROP CONSTRAINT IF EXISTS code_submissions_guest_name_octet_length_chk;
ALTER TABLE code_participants DROP CONSTRAINT IF EXISTS code_participants_name_octet_length_chk;

ALTER TABLE code_rooms
  DROP CONSTRAINT IF EXISTS code_rooms_invite_code_octet_length_chk,
  DROP CONSTRAINT IF EXISTS code_rooms_duel_topic_octet_length_chk;

ALTER TABLE arena_submissions
  ALTER COLUMN runtime_ms TYPE BIGINT USING runtime_ms::bigint,
  ALTER COLUMN passed_count TYPE INT USING passed_count::integer,
  ALTER COLUMN total_count TYPE INT USING total_count::integer;

ALTER TABLE arena_match_players
  ALTER COLUMN best_runtime_ms TYPE BIGINT USING best_runtime_ms::bigint;

ALTER TABLE arena_matches
  ALTER COLUMN duration_seconds TYPE INT USING duration_seconds::integer;

ALTER TABLE code_task_test_cases
  ALTER COLUMN weight TYPE INT USING weight::integer,
  ALTER COLUMN "order" TYPE INT USING "order"::integer;

ALTER TABLE code_submissions
  ALTER COLUMN duration_ms TYPE BIGINT USING duration_ms::bigint,
  ALTER COLUMN passed_count TYPE INT USING passed_count::integer,
  ALTER COLUMN total_count TYPE INT USING total_count::integer;

ALTER TABLE code_rooms
  ALTER COLUMN code_revision TYPE BIGINT USING code_revision::bigint;
