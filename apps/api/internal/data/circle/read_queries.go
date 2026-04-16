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
	if err := r.data.DB.QueryRow(ctx, `
SELECT COUNT(*) FROM circles c
WHERE c.is_public = true
   OR EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = $1)`,
		currentUserID,
	).Scan(&totalCount); err != nil {
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
WHERE c.is_public = true
   OR EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = $1)
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

func (r *Repo) ListCircleMembers(ctx context.Context, circleID uuid.UUID, limit int32) ([]*model.CircleMemberProfile, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `
SELECT
  u.id,
  COALESCE(NULLIF(u.first_name, ''), '') AS first_name,
  COALESCE(NULLIF(u.last_name, ''), '') AS last_name,
  COALESCE(NULLIF(u.yandex_avatar_url, ''), CASE WHEN u.telegram_id IS NOT NULL THEN '/api/v1/profile/avatar/' || u.id::text END, '') AS avatar_url,
  cm.role,
  cm.joined_at
FROM circle_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.circle_id = $1
ORDER BY cm.joined_at ASC
LIMIT $2
`
	rows, err := r.data.DB.Query(ctx, query, circleID, limit)
	if err != nil {
		return nil, fmt.Errorf("query circle members: %w", err)
	}
	defer rows.Close()

	members := make([]*model.CircleMemberProfile, 0, limit)
	for rows.Next() {
		var m model.CircleMemberProfile
		if err := rows.Scan(&m.UserID, &m.FirstName, &m.LastName, &m.AvatarURL, &m.Role, &m.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan circle member: %w", err)
		}
		members = append(members, &m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate circle members: %w", err)
	}
	return members, nil
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
