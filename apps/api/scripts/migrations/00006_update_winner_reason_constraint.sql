-- +goose Up
-- +goose StatementBegin
ALTER TABLE arena_matches
DROP CONSTRAINT IF EXISTS arena_matches_winner_reason_check;

ALTER TABLE arena_matches
ADD CONSTRAINT arena_matches_winner_reason_check
CHECK (
  winner_reason IN (
    'accepted_time',
    'runtime',
    'timeout',
    'single_ac',
    'anti_cheat',
    'none'
  )
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE arena_matches
DROP CONSTRAINT IF EXISTS arena_matches_winner_reason_check;

ALTER TABLE arena_matches
ADD CONSTRAINT arena_matches_winner_reason_check
CHECK (
  winner_reason IN (
    'accepted_time',
    'runtime',
    'timeout'
  )
);
-- +goose StatementEnd