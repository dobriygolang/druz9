package arena

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "api/internal/domain/arena"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) MatchmakeOrEnqueue(ctx context.Context, user *domain.User, task *domain.Task, topic, difficulty string, obfuscateOpponent bool) (*domain.Match, bool, error) {
	if user == nil {
		return nil, false, nil
	}

	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, false, fmt.Errorf("begin arena queue tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var opponent domain.QueueEntry
	err = tx.QueryRow(ctx, `
		SELECT user_id, display_name, topic, difficulty, queued_at, updated_at
		FROM arena_match_queue
		WHERE user_id <> $1
		  AND topic = $2
		  AND difficulty = $3
		ORDER BY queued_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	`, user.ID, topic, model.ArenaDifficultyFromString(difficulty)).Scan(
		&opponent.UserID, &opponent.DisplayName, &opponent.Topic, &opponent.Difficulty, &opponent.QueuedAt, &opponent.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		_, err = tx.Exec(ctx, `
			INSERT INTO arena_match_queue (user_id, display_name, topic, difficulty, queued_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (user_id)
			DO UPDATE SET display_name = EXCLUDED.display_name, topic = EXCLUDED.topic, difficulty = EXCLUDED.difficulty, updated_at = NOW()
		`, user.ID, resolveArenaDisplayName(user), topic, model.ArenaDifficultyFromString(difficulty))
		if err != nil {
			return nil, false, fmt.Errorf("enqueue arena player: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, false, fmt.Errorf("commit arena enqueue tx: %w", err)
		}
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("select arena queue opponent: %w", err)
	}

	nowTime := time.Now().UTC()
	matchID := uuid.New()
	currentDisplayName := resolveArenaDisplayName(user)
	match := &domain.Match{
		ID:                matchID,
		CreatorUserID:     opponent.UserID,
		TaskID:            task.ID,
		Topic:             topic,
		Difficulty:        model.ArenaDifficultyFromString(difficulty),
		Source:            domain.MatchSourceMatchmaking,
		Status:            domain.MatchStatusActive,
		DurationSeconds:   600,
		ObfuscateOpponent: obfuscateOpponent,
		WinnerReason:      domain.WinnerReasonNone,
		CreatedAt:         nowTime,
		UpdatedAt:         nowTime,
		StartedAt:         &nowTime,
	}

	if _, err := tx.Exec(ctx, `DELETE FROM arena_match_queue WHERE user_id IN ($1, $2)`, user.ID, opponent.UserID); err != nil {
		return nil, false, fmt.Errorf("delete arena queue entries: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_matches (id, creator_user_id, task_id, topic, difficulty, source, status, duration_seconds, obfuscate_opponent, is_rated, unrated_reason, winner_reason, started_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $13)
	`, matchID, opponent.UserID, task.ID, topic, match.Difficulty, match.Source, model.ArenaMatchStatusActive, match.DurationSeconds, obfuscateOpponent, true, "", model.ArenaWinnerReasonUnknown, nowTime); err != nil {
		return nil, false, fmt.Errorf("insert matched arena match: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_match_players (match_id, user_id, display_name, side, is_creator, joined_at, updated_at)
		VALUES
		  ($1, $2, $3, $5, TRUE, $4, $4),
		  ($1, $6, $7, $8, FALSE, $4, $4)
	`, matchID, opponent.UserID, opponent.DisplayName, nowTime, model.ArenaPlayerSideLeft, user.ID, currentDisplayName, model.ArenaPlayerSideRight); err != nil {
		return nil, false, fmt.Errorf("insert matched arena players: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES
		  ($1, $2, $4, $3),
		  ($1, $5, $4, $3)
	`, matchID, opponent.UserID, nowTime, task.StarterCode, user.ID); err != nil {
		return nil, false, fmt.Errorf("insert matched arena editor states: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit arena matchmake tx: %w", err)
	}
	created, err := r.GetMatch(ctx, matchID)
	if err != nil {
		return nil, false, err
	}
	return created, true, nil
}

func (r *Repo) GetQueueEntry(ctx context.Context, userID uuid.UUID) (*domain.QueueEntry, error) {
	var item domain.QueueEntry
	err := r.data.DB.QueryRow(ctx, `
		SELECT user_id, display_name, topic, difficulty, queued_at, updated_at
		FROM arena_match_queue
		WHERE user_id = $1
	`, userID).Scan(&item.UserID, &item.DisplayName, &item.Topic, &item.Difficulty, &item.QueuedAt, &item.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get arena queue entry: %w", err)
	}
	return &item, nil
}

func (r *Repo) CountQueueEntries(ctx context.Context) (int32, error) {
	var count int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*)::int FROM arena_match_queue`).Scan(&count); err != nil {
		return 0, fmt.Errorf("count arena queue entries: %w", err)
	}
	return count, nil
}

func (r *Repo) RemoveFromQueue(ctx context.Context, userID uuid.UUID) error {
	if _, err := r.data.DB.Exec(ctx, `DELETE FROM arena_match_queue WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("remove arena queue entry: %w", err)
	}
	return nil
}

func (r *Repo) FindOpenMatchByUser(ctx context.Context, userID uuid.UUID) (*domain.Match, error) {
	var matchID uuid.UUID
	err := r.data.DB.QueryRow(ctx, `
		SELECT m.id
		FROM arena_matches m
		JOIN arena_match_players p ON p.match_id = m.id
		WHERE p.user_id = $1
		  AND m.status IN ($2, $3)
		  AND m.source = $4
		ORDER BY m.updated_at DESC
		LIMIT 1
	`, userID, model.ArenaMatchStatusWaiting, model.ArenaMatchStatusActive, model.ArenaMatchSourceMatchmaking).Scan(&matchID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find open arena match by user: %w", err)
	}
	return r.GetMatch(ctx, matchID)
}
