// Package friend_challenge (data layer) implements the domain Repository
// backed by Postgres via pgx.
package friend_challenge

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	friendchallengedomain "api/internal/domain/friend_challenge"
	"api/internal/model"
	"api/internal/storage/postgres"
)

// Repo is the pgx-backed implementation.
type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

// baseSelectSQL joins the users table twice to pull the latest username for
// each side so the API doesn't have to re-query.
const baseSelectSQL = `
    SELECT
        fc.id, fc.challenger_id, cu.username, fc.opponent_id, ou.username,
        fc.task_title, fc.task_topic, fc.task_difficulty, fc.task_ref, fc.note, fc.status,
        fc.challenger_submitted_at, fc.challenger_time_ms, fc.challenger_score,
        fc.opponent_submitted_at, fc.opponent_time_ms, fc.opponent_score,
        fc.winner_id, fc.deadline_at, fc.created_at, fc.completed_at
    FROM friend_challenges fc
    JOIN users cu ON cu.id = fc.challenger_id
    JOIN users ou ON ou.id = fc.opponent_id
`

// Insert persists a freshly-created challenge.
func (r *Repo) Insert(ctx context.Context, ch *model.FriendChallenge) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO friend_challenges (
		    id, challenger_id, opponent_id, task_title, task_topic, task_difficulty,
		    task_ref, note, status, deadline_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		ch.ID, ch.ChallengerID, ch.OpponentID, ch.TaskTitle, ch.TaskTopic,
		int16(ch.TaskDifficulty), ch.TaskRef, ch.Note, int16(ch.Status),
		ch.DeadlineAt, ch.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert challenge: %w", err)
	}
	return nil
}

// GetByID returns (nil, nil) when the row is missing so the domain layer can
// return ErrChallengeNotFound cleanly.
func (r *Repo) GetByID(ctx context.Context, id uuid.UUID) (*model.FriendChallenge, error) {
	row := r.data.DB.QueryRow(ctx, baseSelectSQL+` WHERE fc.id = $1`, id)
	ch, err := scanOne(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, friendchallengedomain.ErrChallengeNotFound
		}
		return nil, fmt.Errorf("get challenge: %w", err)
	}
	return ch, nil
}

// Update writes the mutable columns. Insert-only columns are ignored.
func (r *Repo) Update(ctx context.Context, ch *model.FriendChallenge) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE friend_challenges SET
		    status                  = $2,
		    challenger_submitted_at = $3,
		    challenger_time_ms      = $4,
		    challenger_score        = $5,
		    opponent_submitted_at   = $6,
		    opponent_time_ms        = $7,
		    opponent_score          = $8,
		    winner_id               = $9,
		    completed_at            = $10
		WHERE id = $1
	`,
		ch.ID, int16(ch.Status),
		ch.ChallengerSubmittedAt, ch.ChallengerTimeMs, ch.ChallengerScore,
		ch.OpponentSubmittedAt, ch.OpponentTimeMs, ch.OpponentScore,
		ch.WinnerID, ch.CompletedAt,
	)
	if err != nil {
		return fmt.Errorf("update challenge: %w", err)
	}
	return nil
}

// ListIncoming returns active (PENDING/IN_PROGRESS) challenges where the
// user is the opponent. Terminal statuses are excluded — they live in history.
func (r *Repo) ListIncoming(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.FriendChallenge, int32, error) {
	return r.listByRole(ctx, userID, "opponent_id", activeStatuses, limit, offset)
}

// ListSent returns active challenges the user originated.
func (r *Repo) ListSent(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.FriendChallenge, int32, error) {
	return r.listByRole(ctx, userID, "challenger_id", activeStatuses, limit, offset)
}

// ListHistory returns terminal challenges where the user participated on
// either side.
func (r *Repo) ListHistory(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.FriendChallenge, int32, error) {
	rows, err := r.data.DB.Query(ctx, baseSelectSQL+`
        WHERE (fc.challenger_id = $1 OR fc.opponent_id = $1)
          AND fc.status IN (3, 4, 5)
        ORDER BY COALESCE(fc.completed_at, fc.created_at) DESC
        LIMIT $2 OFFSET $3
    `, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list history: %w", err)
	}
	defer rows.Close()

	items, err := scanList(rows)
	if err != nil {
		return nil, 0, err
	}

	var total int32
	if err := r.data.DB.QueryRow(ctx, `
        SELECT COUNT(*) FROM friend_challenges
        WHERE (challenger_id = $1 OR opponent_id = $1)
          AND status IN (3, 4, 5)
    `, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count history: %w", err)
	}
	return items, total, nil
}

// SweepExpired transitions PENDING/IN_PROGRESS rows whose deadline has passed
// into EXPIRED. Returns count updated.
func (r *Repo) SweepExpired(ctx context.Context, now time.Time) (int, error) {
	tag, err := r.data.DB.Exec(ctx, `
        UPDATE friend_challenges
        SET status = 4, completed_at = $1
        WHERE status IN (1, 2) AND deadline_at <= $1
    `, now)
	if err != nil {
		return 0, fmt.Errorf("sweep expired: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

// ----- internals -----

var activeStatuses = []int16{int16(model.ChallengeStatusPending), int16(model.ChallengeStatusInProgress)}

func (r *Repo) listByRole(
	ctx context.Context, userID uuid.UUID, column string, statuses []int16, limit, offset int32,
) ([]*model.FriendChallenge, int32, error) {
	// column is not user-supplied — it's a fixed identifier in this file.
	query := baseSelectSQL + `
        WHERE fc.` + column + ` = $1
          AND fc.status = ANY($2)
        ORDER BY fc.created_at DESC
        LIMIT $3 OFFSET $4
    `
	rows, err := r.data.DB.Query(ctx, query, userID, statuses, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list challenges by %s: %w", column, err)
	}
	defer rows.Close()

	items, err := scanList(rows)
	if err != nil {
		return nil, 0, err
	}

	var total int32
	if err := r.data.DB.QueryRow(ctx, `
        SELECT COUNT(*) FROM friend_challenges
        WHERE `+column+` = $1 AND status = ANY($2)
    `, userID, statuses).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count by %s: %w", column, err)
	}
	return items, total, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanOne(s scanner) (*model.FriendChallenge, error) {
	var ch model.FriendChallenge
	var difficulty int16
	var status int16
	var winnerID *uuid.UUID
	err := s.Scan(
		&ch.ID, &ch.ChallengerID, &ch.ChallengerUsername,
		&ch.OpponentID, &ch.OpponentUsername,
		&ch.TaskTitle, &ch.TaskTopic, &difficulty, &ch.TaskRef, &ch.Note, &status,
		&ch.ChallengerSubmittedAt, &ch.ChallengerTimeMs, &ch.ChallengerScore,
		&ch.OpponentSubmittedAt, &ch.OpponentTimeMs, &ch.OpponentScore,
		&winnerID, &ch.DeadlineAt, &ch.CreatedAt, &ch.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan challenge: %w", err)
	}
	ch.TaskDifficulty = model.ChallengeDifficulty(difficulty)
	ch.Status = model.ChallengeStatus(status)
	ch.WinnerID = winnerID
	return &ch, nil
}

func scanList(rows pgx.Rows) ([]*model.FriendChallenge, error) {
	items := make([]*model.FriendChallenge, 0)
	for rows.Next() {
		ch, err := scanOne(rows)
		if err != nil {
			return nil, fmt.Errorf("scan challenge: %w", err)
		}
		items = append(items, ch)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate challenges: %w", err)
	}
	return items, nil
}
