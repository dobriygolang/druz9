package circle

import (
	"context"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
)

const (
	defaultCirclesLimit = 20
	maxCirclesLimit     = 100
)

func (r *Repo) ListCircles(
	ctx context.Context,
	currentUserID uuid.UUID,
	opts model.ListCirclesOptions,
) (*model.ListCirclesResponse, error) {
	if opts.Limit <= 0 || opts.Limit > maxCirclesLimit {
		opts.Limit = defaultCirclesLimit
	}

	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*) FROM circles`).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count circles: %w", err)
	}

	query := `
SELECT
  c.id,
  c.name,
  c.description,
  c.creator_id,
  c.member_count,
  c.tags,
  c.is_public,
  c.created_at,
  EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = $1) AS is_joined
FROM circles c
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3
`
	rows, err := r.data.DB.Query(ctx, query, currentUserID, opts.Limit, opts.Offset)
	if err != nil {
		return nil, fmt.Errorf("query circles: %w", err)
	}
	defer rows.Close()

	circles := make([]*model.Circle, 0, opts.Limit)
	for rows.Next() {
		var c model.Circle
		if err := rows.Scan(
			&c.ID,
			&c.Name,
			&c.Description,
			&c.CreatorID,
			&c.MemberCount,
			&c.Tags,
			&c.IsPublic,
			&c.CreatedAt,
			&c.IsJoined,
		); err != nil {
			return nil, fmt.Errorf("scan circle: %w", err)
		}
		circles = append(circles, &c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate circles: %w", err)
	}

	return &model.ListCirclesResponse{
		Circles:    circles,
		TotalCount: totalCount,
	}, nil
}

func (r *Repo) IsMember(ctx context.Context, circleID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.data.DB.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2)`,
		circleID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check circle membership: %w", err)
	}
	return exists, nil
}
