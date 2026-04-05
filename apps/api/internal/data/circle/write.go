package circle

import (
	"context"
	"fmt"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) CreateCircle(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string) (*model.Circle, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	circleID := uuid.New()
	if _, err := tx.Exec(ctx, `
INSERT INTO circles (id, name, description, creator_id, tags, member_count)
VALUES ($1, $2, $3, $4, $5, 1)`,
		circleID, name, description, creatorID, tags,
	); err != nil {
		return nil, fmt.Errorf("insert circle: %w", err)
	}

	if _, err := tx.Exec(ctx, `
INSERT INTO circle_members (circle_id, user_id, role) VALUES ($1, $2, 'creator')`,
		circleID, creatorID,
	); err != nil {
		return nil, fmt.Errorf("insert circle creator member: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &model.Circle{
		ID:          circleID,
		Name:        name,
		Description: description,
		CreatorID:   creatorID,
		MemberCount: 1,
		Tags:        tags,
		IsPublic:    true,
		IsJoined:    true,
	}, nil
}

func (r *Repo) JoinCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM circles WHERE id = $1)`, circleID).Scan(&exists); err != nil {
		return fmt.Errorf("check circle exists: %w", err)
	}
	if !exists {
		return kratoserrors.NotFound("CIRCLE_NOT_FOUND", "circle not found")
	}

	tag, err := tx.Exec(ctx, `
INSERT INTO circle_members (circle_id, user_id, role) VALUES ($1, $2, 'member')
ON CONFLICT (circle_id, user_id) DO NOTHING`, circleID, userID)
	if err != nil {
		return fmt.Errorf("join circle: %w", err)
	}

	if tag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx, `UPDATE circles SET member_count = member_count + 1, updated_at = now() WHERE id = $1`, circleID); err != nil {
			return fmt.Errorf("update member count: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repo) LeaveCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var role string
	err = tx.QueryRow(ctx,
		`SELECT role FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
		circleID, userID,
	).Scan(&role)
	if err != nil {
		if err == pgx.ErrNoRows {
			return kratoserrors.NotFound("NOT_A_MEMBER", "not a member of this circle")
		}
		return fmt.Errorf("check membership: %w", err)
	}
	if role == "creator" {
		return kratoserrors.BadRequest("CREATOR_CANNOT_LEAVE", "creator cannot leave own circle")
	}

	if _, err := tx.Exec(ctx,
		`DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
		circleID, userID,
	); err != nil {
		return fmt.Errorf("leave circle: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE circles SET member_count = GREATEST(member_count - 1, 0), updated_at = now() WHERE id = $1`,
		circleID,
	); err != nil {
		return fmt.Errorf("update member count: %w", err)
	}

	return tx.Commit(ctx)
}
