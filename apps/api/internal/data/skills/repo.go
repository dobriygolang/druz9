package skills

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/storage/postgres"
)

type SkillAllocation struct {
	UserID      uuid.UUID
	SkillID     string
	AllocatedAt time.Time
}

type SkillPoints struct {
	UserID    uuid.UUID
	Earned    int32
	Spent     int32
	UpdatedAt time.Time
}

type Repo struct {
	data *postgres.Store
}

func NewRepo(data *postgres.Store) *Repo {
	return &Repo{data: data}
}

func (r *Repo) GetPoints(ctx context.Context, userID uuid.UUID) (SkillPoints, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT user_id, earned, spent, updated_at
		FROM user_skill_points
		WHERE user_id = $1
	`, userID)
	var sp SkillPoints
	err := row.Scan(&sp.UserID, &sp.Earned, &sp.Spent, &sp.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return SkillPoints{UserID: userID}, nil
	}
	return sp, err
}

func (r *Repo) AddEarnedPoints(ctx context.Context, userID uuid.UUID, delta int32) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO user_skill_points (user_id, earned, spent, updated_at)
		VALUES ($1, $2, 0, NOW())
		ON CONFLICT (user_id) DO UPDATE
		  SET earned = user_skill_points.earned + $2,
		      updated_at = NOW()
	`, userID, delta)
	return err
}

func (r *Repo) ListAllocations(ctx context.Context, userID uuid.UUID) ([]SkillAllocation, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT user_id, skill_id, allocated_at
		FROM user_skill_allocations
		WHERE user_id = $1
		ORDER BY allocated_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SkillAllocation
	for rows.Next() {
		var a SkillAllocation
		if err := rows.Scan(&a.UserID, &a.SkillID, &a.AllocatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *Repo) HasAllocation(ctx context.Context, userID uuid.UUID, skillID string) (bool, error) {
	var exists bool
	err := r.data.DB.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM user_skill_allocations
			WHERE user_id = $1 AND skill_id = $2
		)
	`, userID, skillID).Scan(&exists)
	return exists, err
}

// Allocate inserts the allocation and increments spent counter atomically.
func (r *Repo) Allocate(ctx context.Context, userID uuid.UUID, skillID string) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_skill_allocations (user_id, skill_id, allocated_at)
		VALUES ($1, $2, NOW())
	`, userID, skillID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_skill_points (user_id, earned, spent, updated_at)
		VALUES ($1, 0, 1, NOW())
		ON CONFLICT (user_id) DO UPDATE
		  SET spent = user_skill_points.spent + 1,
		      updated_at = NOW()
	`, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// Refund removes the allocation and decrements spent counter atomically.
func (r *Repo) Refund(ctx context.Context, userID uuid.UUID, skillID string) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var deleted int
	if err := tx.QueryRow(ctx, `
		DELETE FROM user_skill_allocations
		WHERE user_id = $1 AND skill_id = $2
		RETURNING 1
	`, userID, skillID).Scan(&deleted); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_skill_points
		SET spent = GREATEST(0, spent - 1), updated_at = NOW()
		WHERE user_id = $1
	`, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
