package circle

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) CreateCircle(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Circle, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	circleID := uuid.New()
	if _, err := tx.Exec(ctx, `
INSERT INTO circles (id, name, description, creator_id, tags, member_count, is_public)
VALUES ($1, $2, $3, $4, $5, 1, $6)`,
		circleID, name, description, creatorID, tags, isPublic,
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
		IsPublic:    isPublic,
		IsJoined:    true,
	}, nil
}

func (r *Repo) GetCircle(ctx context.Context, circleID uuid.UUID) (*model.Circle, error) {
	var c model.Circle
	err := r.data.DB.QueryRow(ctx, `
SELECT id, name, description, creator_id, member_count, tags, is_public, created_at
FROM circles WHERE id = $1`, circleID).Scan(
		&c.ID, &c.Name, &c.Description, &c.CreatorID,
		&c.MemberCount, &c.Tags, &c.IsPublic, &c.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kratoserrors.NotFound("CIRCLE_NOT_FOUND", "circle not found")
		}
		return nil, fmt.Errorf("get circle: %w", err)
	}
	return &c, nil
}

func (r *Repo) InviteToCircle(ctx context.Context, circleID, inviterID, inviteeID uuid.UUID) error {
	// Only creator can invite
	circle, err := r.GetCircle(ctx, circleID)
	if err != nil {
		return err
	}
	if circle.CreatorID != inviterID {
		return kratoserrors.Forbidden("FORBIDDEN", "only the circle creator can invite members")
	}

	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tag, err := tx.Exec(ctx, `
INSERT INTO circle_members (circle_id, user_id, role) VALUES ($1, $2, 'member')
ON CONFLICT (circle_id, user_id) DO NOTHING`, circleID, inviteeID)
	if err != nil {
		return fmt.Errorf("invite to circle: %w", err)
	}
	if tag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx,
			`UPDATE circles SET member_count = member_count + 1, updated_at = now() WHERE id = $1`,
			circleID,
		); err != nil {
			return fmt.Errorf("update member count: %w", err)
		}
	}
	return tx.Commit(ctx)
}

func (r *Repo) JoinCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var exists, isPublic bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM circles WHERE id = $1), COALESCE((SELECT is_public FROM circles WHERE id = $1), false)`, circleID, circleID).Scan(&exists, &isPublic); err != nil {
		return fmt.Errorf("check circle exists: %w", err)
	}
	if !exists {
		return kratoserrors.NotFound("CIRCLE_NOT_FOUND", "circle not found")
	}
	if !isPublic {
		return kratoserrors.Forbidden("CIRCLE_PRIVATE", "this circle is private; you must be invited to join")
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

func (r *Repo) DeleteCircle(ctx context.Context, circleID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Cascade: remove members, then circle itself
	if _, err := tx.Exec(ctx, `DELETE FROM circle_members WHERE circle_id = $1`, circleID); err != nil {
		return fmt.Errorf("delete circle members: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM circles WHERE id = $1`, circleID); err != nil {
		return fmt.Errorf("delete circle: %w", err)
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
