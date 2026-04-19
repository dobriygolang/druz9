-- +goose Up
-- +goose StatementBegin

-- Backfill arena_player_stats for users who completed registration but never played a match.
-- Default ELO is 1000 (consistent with arena_player_ratings default).
INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, peak_rating, updated_at)
SELECT
    u.id,
    COALESCE(NULLIF(u.username, ''), u.first_name, 'Player'),
    1000,
    0, 0, 0, 0, 1000,
    NOW()
FROM users u
-- model.UserStatusActive = 2; users.status is an INT column, not text.
WHERE u.status = 2
ON CONFLICT (user_id) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- No-op: this backfill is intentionally not reverted because arena_player_stats
-- may contain real match activity after the migration runs.
SELECT 1;
-- +goose StatementEnd
