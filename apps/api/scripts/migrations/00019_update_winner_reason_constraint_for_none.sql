-- +goose Up
-- +goose StatementBegin
ALTER TABLE arena_matches
DROP CONSTRAINT IF EXISTS arena_matches_winner_reason_check;

ALTER TABLE arena_matches
ADD CONSTRAINT arena_matches_winner_reason_check
CHECK (winner_reason BETWEEN 0 AND 7);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE arena_matches
DROP CONSTRAINT IF EXISTS arena_matches_winner_reason_check;

ALTER TABLE arena_matches
ADD CONSTRAINT arena_matches_winner_reason_check
CHECK (winner_reason BETWEEN 0 AND 6);
-- +goose StatementEnd
