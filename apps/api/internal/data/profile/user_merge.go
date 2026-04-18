package profile

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
)

func (r *Repo) mergeUsersTx(ctx context.Context, tx pgx.Tx, canonicalUserID, secondaryUserID uuid.UUID) error {
	if canonicalUserID == secondaryUserID {
		return nil
	}

	batch := &pgx.Batch{}

	// 1. Merge user profile fields
	batch.Queue(`
UPDATE users canonical
SET
  username = COALESCE(NULLIF(canonical.username, ''), NULLIF(secondary.username, ''), ''),
  first_name = COALESCE(NULLIF(canonical.first_name, ''), NULLIF(secondary.first_name, ''), ''),
  last_name = COALESCE(NULLIF(canonical.last_name, ''), NULLIF(secondary.last_name, ''), ''),
  current_workplace = COALESCE(NULLIF(canonical.current_workplace, ''), NULLIF(secondary.current_workplace, ''), ''),
  status = CASE
    WHEN canonical.status = $3 OR secondary.status = $3 THEN $3
    WHEN canonical.status = $4 OR secondary.status = $4 THEN $4
    WHEN canonical.status = $5 OR secondary.status = $5 THEN $5
    ELSE canonical.status
  END,
  primary_provider = COALESCE(NULLIF(canonical.primary_provider, ''), NULLIF(secondary.primary_provider, ''), ''),
  yandex_id = COALESCE(NULLIF(canonical.yandex_id, ''), NULLIF(secondary.yandex_id, ''), ''),
  yandex_avatar_url = COALESCE(NULLIF(canonical.yandex_avatar_url, ''), NULLIF(secondary.yandex_avatar_url, ''), ''),
  telegram_id = COALESCE(canonical.telegram_id, secondary.telegram_id),
  telegram_username = COALESCE(NULLIF(canonical.telegram_username, ''), NULLIF(secondary.telegram_username, ''), ''),
  telegram_avatar_url = COALESCE(NULLIF(canonical.telegram_avatar_url, ''), NULLIF(secondary.telegram_avatar_url, ''), ''),
  last_active_at = GREATEST(canonical.last_active_at, secondary.last_active_at),
  updated_at = NOW()
FROM users secondary
WHERE canonical.id = $1
  AND secondary.id = $2
`, canonicalUserID, secondaryUserID, model.UserStatusActive, model.UserStatusPendingProfile, model.UserStatusGuest)

	// 2. Geo: dedupe then move
	batch.Queue(`DELETE FROM geo g USING geo keep WHERE g.user_id = $2 AND keep.user_id = $1`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE geo SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 3. Sessions
	batch.Queue(`UPDATE sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 4. Events
	batch.Queue(`UPDATE events SET creator_id = $1 WHERE creator_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM event_participants ep USING event_participants keep WHERE ep.user_id = $2 AND keep.user_id = $1 AND keep.event_id = ep.event_id`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE event_participants SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 5. Podcasts & Referrals
	batch.Queue(`UPDATE podcasts SET author_id = $1 WHERE author_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE referrals SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 6. Code rooms & participants
	batch.Queue(`UPDATE code_rooms SET creator_id = $1 WHERE creator_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE code_rooms SET winner_user_id = $1 WHERE winner_user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM code_participants cp USING code_participants keep WHERE cp.user_id = $2 AND keep.user_id = $1 AND keep.room_id = cp.room_id`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE code_participants SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE code_submissions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 7. Arena matches & players
	batch.Queue(`UPDATE arena_matches SET creator_user_id = $1 WHERE creator_user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE arena_matches SET winner_user_id = $1 WHERE winner_user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM arena_match_players p USING arena_match_players keep WHERE p.user_id = $2 AND keep.user_id = $1 AND keep.match_id = p.match_id`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE arena_match_players SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM arena_editor_states s USING arena_editor_states keep WHERE s.user_id = $2 AND keep.user_id = $1 AND keep.match_id = s.match_id`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE arena_editor_states SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE arena_submissions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM arena_rating_penalties p USING arena_rating_penalties keep WHERE p.user_id = $2 AND keep.user_id = $1 AND keep.match_id = p.match_id AND keep.reason = p.reason`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE arena_rating_penalties SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 8. Arena queue & stats (merge with UPSERT)
	batch.Queue(`
INSERT INTO arena_match_queue (user_id, display_name, topic, difficulty, queued_at, updated_at)
SELECT $1, display_name, topic, difficulty, queued_at, NOW()
FROM arena_match_queue
WHERE user_id = $2
ON CONFLICT (user_id) DO NOTHING
`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM arena_match_queue WHERE user_id = $1`, secondaryUserID)
	batch.Queue(`
INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, updated_at)
SELECT $1, display_name, rating, wins, losses, matches, best_runtime_ms, NOW()
FROM arena_player_stats
WHERE user_id = $2
ON CONFLICT (user_id) DO UPDATE SET
  display_name = COALESCE(NULLIF(arena_player_stats.display_name, ''), NULLIF(EXCLUDED.display_name, ''), arena_player_stats.display_name),
  wins = arena_player_stats.wins + EXCLUDED.wins,
  losses = arena_player_stats.losses + EXCLUDED.losses,
  matches = arena_player_stats.matches + EXCLUDED.matches,
  best_runtime_ms = CASE
    WHEN arena_player_stats.best_runtime_ms = 0 THEN EXCLUDED.best_runtime_ms
    WHEN EXCLUDED.best_runtime_ms = 0 THEN arena_player_stats.best_runtime_ms
    ELSE LEAST(arena_player_stats.best_runtime_ms, EXCLUDED.best_runtime_ms)
  END,
  updated_at = NOW()
`, canonicalUserID, secondaryUserID)
	batch.Queue(`DELETE FROM arena_player_stats WHERE user_id = $1`, secondaryUserID)

	// 9. Interview prep sessions (dedupe + move)
	batch.Queue(`
DELETE FROM interview_practice_sessions src
USING interview_practice_sessions keep
WHERE src.user_id = $2
  AND keep.user_id = $1
  AND src.item_id = keep.item_id
  AND src.status = 'active'
  AND keep.status = 'active'
`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE interview_practice_sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)
	batch.Queue(`UPDATE interview_mock_sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID)

	// 10. Delete secondary user
	batch.Queue(`DELETE FROM users WHERE id = $1`, secondaryUserID)

	// Execute entire batch in a single round-trip.
	results := tx.SendBatch(ctx, batch)
	defer results.Close()

	labels := []string{
		"merge user profiles",
		"dedupe geo", "move geo",
		"move sessions",
		"move events", "dedupe event participants", "move event participants",
		"move podcasts", "move referrals",
		"move code room creators", "move code room winners",
		"dedupe code participants", "move code participants", "move code submissions",
		"move arena match creators", "move arena match winners",
		"dedupe arena match players", "move arena match players",
		"dedupe arena editor states", "move arena editor states",
		"move arena submissions",
		"dedupe arena rating penalties", "move arena rating penalties",
		"merge arena queue", "delete secondary arena queue",
		"merge arena player stats", "delete secondary arena stats",
		"dedupe interview prep sessions", "move interview prep sessions", "move mock interview sessions",
		"delete secondary user",
	}

	for _, label := range labels {
		if _, err := results.Exec(); err != nil {
			return fmt.Errorf("%s: %w", label, err)
		}
	}

	return nil
}
