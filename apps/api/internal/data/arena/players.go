package arena

import (
	"context"
	"fmt"
	"strings"
	"time"

	arenarating "api/internal/arena/rating"
	domain "api/internal/domain/arena"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const antiCheatDuplicateWindow = 2 * time.Second

func (r *Repo) loadPlayersForMatches(ctx context.Context, matches []*domain.Match, matchMap map[uuid.UUID]*domain.Match) error {
	if len(matches) == 0 {
		return nil
	}

	matchIDs := make([]any, len(matches))
	for i, m := range matches {
		matchIDs[i] = m.ID
	}

	rows, err := r.data.DB.Query(ctx, `
		SELECT p.match_id, p.user_id, p.display_name, p.side, p.is_creator,
		       p.freeze_until, p.accepted_at, p.best_runtime_ms, p.is_winner,
		       p.suspicion_count, p.anti_cheat_penalized, p.joined_at, p.updated_at,
		       COALESCE(es.code, '')
		FROM arena_match_players p
		LEFT JOIN arena_editor_states es ON es.match_id = p.match_id AND es.user_id = p.user_id
		WHERE p.match_id = ANY($1)
		ORDER BY p.match_id, CASE WHEN p.side = $2 THEN 0 ELSE 1 END
	`, matchIDs, model.ArenaPlayerSideLeft)
	if err != nil {
		return fmt.Errorf("list arena players batch: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var matchID uuid.UUID
		var player domain.Player
		if err := scanPlayerWithCode(rows, &player); err != nil {
			return fmt.Errorf("scan arena player batch: %w", err)
		}
		matchID = player.MatchID

		if match, ok := matchMap[matchID]; ok {
			match.Players = append(match.Players, &player)
		}
	}

	return rows.Err()
}

func (r *Repo) SavePlayerCode(ctx context.Context, matchID, userID uuid.UUID, code string) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (match_id, user_id)
		DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
	`, matchID, userID, code)
	if err != nil {
		return fmt.Errorf("save arena player code: %w", err)
	}
	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after code save: %w", err)
	}
	return nil
}

func (r *Repo) SavePlayerCodes(ctx context.Context, matchID uuid.UUID, codes map[uuid.UUID]string) error {
	if len(codes) == 0 {
		return nil
	}

	userIDs := make([]string, 0, len(codes))
	codeValues := make([]string, 0, len(codes))
	for userID, code := range codes {
		userIDs = append(userIDs, userID.String())
		codeValues = append(codeValues, code)
	}

	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		SELECT $1::uuid, u::uuid, c, NOW()
		FROM unnest($2::text[], $3::text[]) AS uu(u, c)
		ON CONFLICT (match_id, user_id) DO UPDATE SET
			code = EXCLUDED.code,
			updated_at = NOW()
	`, matchID, userIDs, codeValues)
	if err != nil {
		return fmt.Errorf("save arena player codes batch: %w", err)
	}

	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after codes save: %w", err)
	}
	return nil
}

func (r *Repo) CleanupFinishedEditorStates(ctx context.Context, idleFor time.Duration) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
		DELETE FROM arena_editor_states es
		WHERE es.updated_at < NOW() - $1::interval
		  AND EXISTS (
		    SELECT 1
		    FROM arena_matches m
		    WHERE m.id = es.match_id
		      AND m.status = $2
		  )
	`, idleFor.String(), model.ArenaMatchStatusFinished)
	if err != nil {
		return 0, fmt.Errorf("cleanup finished arena editor states: %w", err)
	}
	return tag.RowsAffected(), nil
}

func (r *Repo) SetPlayerFreeze(ctx context.Context, matchID, userID uuid.UUID, freezeUntil *time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE arena_match_players
		SET freeze_until = $3, updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, freezeUntil)
	if err != nil {
		return fmt.Errorf("set arena freeze: %w", err)
	}
	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after freeze: %w", err)
	}
	return nil
}

func (r *Repo) SetPlayerAccepted(ctx context.Context, matchID, userID uuid.UUID, acceptedAt time.Time, runtimeMs int64) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE arena_match_players
		SET accepted_at = COALESCE(accepted_at, $3),
		    best_runtime_ms = CASE
		      WHEN best_runtime_ms = 0 THEN $4
		      WHEN $4 = 0 THEN best_runtime_ms
		      ELSE LEAST(best_runtime_ms, $4)
		    END,
		    updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, acceptedAt, runtimeMs)
	if err != nil {
		return fmt.Errorf("set arena accepted: %w", err)
	}
	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after accepted: %w", err)
	}
	return nil
}

func (r *Repo) ReportPlayerSuspicion(ctx context.Context, matchID, userID uuid.UUID, reason string) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin report arena suspicion tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	now := time.Now()

	var (
		lastReason string
		lastAt     pgtype.Timestamptz
	)
	if err := tx.QueryRow(ctx, `
		SELECT last_suspicion_reason, last_suspicion_at
		FROM arena_match_players
		WHERE match_id = $1 AND user_id = $2
		FOR UPDATE
	`, matchID, userID).Scan(&lastReason, &lastAt); err != nil {
		return fmt.Errorf("load arena suspicion state: %w", err)
	}

	if shouldDeduplicateSuspicion(lastReason, timestamptzPtr(lastAt), reason, now) {
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit report arena suspicion noop tx: %w", err)
		}
		return nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE arena_match_players
		SET suspicion_count = suspicion_count + 1,
		    last_suspicion_reason = $3,
		    last_suspicion_at = $4,
		    updated_at = $4
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, reason, now); err != nil {
		return fmt.Errorf("report arena suspicion: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit report arena suspicion tx: %w", err)
	}

	return nil
}

func shouldDeduplicateSuspicion(lastReason string, lastAt *time.Time, nextReason string, now time.Time) bool {
	if lastAt == nil || lastAt.IsZero() || now.Sub(*lastAt) > antiCheatDuplicateWindow {
		return false
	}

	prev := normalizeSuspicionReason(lastReason)
	next := normalizeSuspicionReason(nextReason)
	if prev == "" || next == "" {
		return false
	}

	if prev == next {
		return true
	}

	return isFocusLossSuspicion(prev) && isFocusLossSuspicion(next)
}

func normalizeSuspicionReason(reason string) string {
	return strings.ToLower(strings.TrimSpace(reason))
}

func isFocusLossSuspicion(reason string) bool {
	switch normalizeSuspicionReason(reason) {
	case "tab_hidden", "window_blur":
		return true
	default:
		return false
	}
}

func timestamptzPtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time
	return &t
}

func (r *Repo) ApplyAntiCheatPenalty(ctx context.Context, matchID, userID uuid.UUID, delta int32, reason string) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin anti-cheat penalty tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var alreadyPenalized bool
	if err := tx.QueryRow(ctx, `
		SELECT anti_cheat_penalized
		FROM arena_match_players
		WHERE match_id = $1 AND user_id = $2
		FOR UPDATE
	`, matchID, userID).Scan(&alreadyPenalized); err != nil {
		return fmt.Errorf("load anti-cheat penalty state: %w", err)
	}

	var isRegistered bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE id = $1
		)
	`, userID).Scan(&isRegistered); err != nil {
		return fmt.Errorf("load anti-cheat registration state: %w", err)
	}

	if alreadyPenalized {
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit anti-cheat penalty noop: %w", err)
		}
		return nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE arena_match_players
		SET anti_cheat_penalized = TRUE,
		    updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID); err != nil {
		return fmt.Errorf("mark anti-cheat penalized: %w", err)
	}

	if isRegistered {
		if _, err := tx.Exec(ctx, `
			INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, updated_at)
			SELECT p.user_id, p.display_name, GREATEST(100, $3), 0, 0, 0, 0, NOW()
			FROM arena_match_players p
			WHERE p.match_id = $1 AND p.user_id = $2
			ON CONFLICT (user_id) DO UPDATE SET
			  rating = GREATEST(100, arena_player_stats.rating + $3),
			  updated_at = NOW()
		`, matchID, userID, delta); err != nil {
			return fmt.Errorf("apply arena anti-cheat rating penalty: %w", err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO arena_rating_penalties (id, match_id, user_id, reason, delta_rating, created_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
			ON CONFLICT DO NOTHING
		`, uuid.New(), matchID, userID, reason, delta); err != nil {
			return fmt.Errorf("create arena rating penalty history: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anti-cheat penalty: %w", err)
	}

	return nil
}

func (r *Repo) GetPlayer(ctx context.Context, matchID, userID uuid.UUID) (*domain.Player, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT p.match_id, p.user_id, p.display_name, p.side, p.is_creator,
		       p.freeze_until, p.accepted_at, p.best_runtime_ms, p.is_winner,
		       p.suspicion_count, p.anti_cheat_penalized, p.joined_at, p.updated_at,
		       COALESCE(es.code, '')
		FROM arena_match_players p
		LEFT JOIN arena_editor_states es ON es.match_id = p.match_id AND es.user_id = p.user_id
		WHERE p.match_id = $1 AND p.user_id = $2
	`, matchID, userID)

	var player domain.Player
	var freezeUntil, acceptedAt pgtype.Timestamptz
	var updatedAt, joinedAt pgtype.Timestamptz
	err := scanPlayerWithTimestamps(row, &player, &freezeUntil, &acceptedAt, &joinedAt, &updatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get arena player: %w", err)
	}

	if freezeUntil.Valid {
		player.FreezeUntil = &freezeUntil.Time
	}
	if acceptedAt.Valid {
		player.AcceptedAt = &acceptedAt.Time
	}
	player.JoinedAt = joinedAt.Time
	player.UpdatedAt = updatedAt.Time

	return &player, nil
}

func resolveArenaDisplayName(user *domain.User) string {
	if user == nil {
		return "Игрок"
	}
	value := user.FirstName
	if user.LastName != "" {
		value = strings.TrimSpace(value + " " + user.LastName)
	}
	if value != "" {
		return value
	}
	if user.Username != "" {
		return user.Username
	}
	return "Игрок"
}

func arenaNextRating(self, opponent int32, score float64, difficulty string) int32 {
	return arenarating.NextRating(self, opponent, score, difficulty)
}
