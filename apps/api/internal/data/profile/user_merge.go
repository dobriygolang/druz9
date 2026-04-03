package profile

import (
	"context"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) mergeUsersTx(ctx context.Context, tx pgx.Tx, canonicalUserID, secondaryUserID uuid.UUID) error {
	if canonicalUserID == secondaryUserID {
		return nil
	}

	if _, err := tx.Exec(ctx, `
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
  yandex_login = COALESCE(NULLIF(canonical.yandex_login, ''), NULLIF(secondary.yandex_login, ''), ''),
  yandex_email = COALESCE(NULLIF(canonical.yandex_email, ''), NULLIF(secondary.yandex_email, ''), ''),
  yandex_avatar_url = COALESCE(NULLIF(canonical.yandex_avatar_url, ''), NULLIF(secondary.yandex_avatar_url, ''), ''),
  telegram_id = COALESCE(canonical.telegram_id, secondary.telegram_id),
  telegram_username = COALESCE(NULLIF(canonical.telegram_username, ''), NULLIF(secondary.telegram_username, ''), ''),
  telegram_avatar_url = COALESCE(NULLIF(canonical.telegram_avatar_url, ''), NULLIF(secondary.telegram_avatar_url, ''), ''),
  last_active_at = GREATEST(canonical.last_active_at, secondary.last_active_at),
  updated_at = NOW()
FROM users secondary
WHERE canonical.id = $1
  AND secondary.id = $2
`, canonicalUserID, secondaryUserID, model.UserStatusActive, model.UserStatusPendingProfile, model.UserStatusGuest); err != nil {
		return fmt.Errorf("merge user profiles: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM geo g USING geo keep WHERE g.user_id = $2 AND keep.user_id = $1`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe geo: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE geo SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move geo: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE events SET creator_id = $1 WHERE creator_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move events: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM event_participants ep USING event_participants keep WHERE ep.user_id = $2 AND keep.user_id = $1 AND keep.event_id = ep.event_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe event participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE event_participants SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move event participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE podcasts SET author_id = $1 WHERE author_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move podcasts: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE referrals SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move referrals: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_rooms SET creator_id = $1 WHERE creator_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code room creators: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_rooms SET winner_user_id = $1 WHERE winner_user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code room winners: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM code_participants cp USING code_participants keep WHERE cp.user_id = $2 AND keep.user_id = $1 AND keep.room_id = cp.room_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe code participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_participants SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_submissions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code submissions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_matches SET creator_user_id = $1 WHERE creator_user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena match creators: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_matches SET winner_user_id = $1 WHERE winner_user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena match winners: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_match_players p USING arena_match_players keep WHERE p.user_id = $2 AND keep.user_id = $1 AND keep.match_id = p.match_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe arena match players: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_match_players SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena match players: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_editor_states s USING arena_editor_states keep WHERE s.user_id = $2 AND keep.user_id = $1 AND keep.match_id = s.match_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe arena editor states: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_editor_states SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena editor states: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_submissions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena submissions: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_rating_penalties p USING arena_rating_penalties keep WHERE p.user_id = $2 AND keep.user_id = $1 AND keep.match_id = p.match_id AND keep.reason = p.reason`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe arena rating penalties: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_rating_penalties SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena rating penalties: %w", err)
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO arena_match_queue (user_id, display_name, topic, difficulty, queued_at, updated_at)
SELECT $1, display_name, topic, difficulty, queued_at, NOW()
FROM arena_match_queue
WHERE user_id = $2
ON CONFLICT (user_id) DO NOTHING
`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("merge arena queue: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_match_queue WHERE user_id = $1`, secondaryUserID); err != nil {
		return fmt.Errorf("delete secondary arena queue: %w", err)
	}
	if _, err := tx.Exec(ctx, `
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
`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("merge arena player stats: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_player_stats WHERE user_id = $1`, secondaryUserID); err != nil {
		return fmt.Errorf("delete secondary arena stats: %w", err)
	}
	if _, err := tx.Exec(ctx, `
DELETE FROM interview_prep_sessions src
USING interview_prep_sessions keep
WHERE src.user_id = $2
  AND keep.user_id = $1
  AND src.task_id = keep.task_id
  AND src.status = 'active'
  AND keep.status = 'active'
`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe interview prep sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE interview_prep_sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move interview prep sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE interview_prep_mock_sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move mock interview sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM users WHERE id = $1`, secondaryUserID); err != nil {
		return fmt.Errorf("delete secondary user: %w", err)
	}

	return nil
}
