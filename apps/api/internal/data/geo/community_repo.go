package geo

import (
	"context"
	"fmt"

	"api/internal/model"
)

func (c *Client) ListCommunityPoints(ctx context.Context, currentUserID string) ([]*model.CommunityMapPoint, error) {
	const query = `
SELECT
  u.id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.username, ''), ''),
  g.region,
  g.latitude,
  g.longitude,
  COALESCE(NULLIF(u.yandex_avatar_url, ''), NULLIF(u.telegram_avatar_url, ''), ''),
  COALESCE(u.username, ''),
  COALESCE(u.first_name, ''),
  COALESCE(u.last_name, ''),
  CASE
    WHEN COALESCE(u.last_active_at, u.updated_at, u.created_at, NOW()) >= NOW() - INTERVAL '2 minutes' THEN 'online'
    WHEN COALESCE(u.last_active_at, u.updated_at, u.created_at, NOW()) >= NOW() - INTERVAL '15 minutes' THEN 'recently_active'
    ELSE 'offline'
  END
FROM geo g
JOIN users u ON u.id = g.user_id
WHERE u.status = $1
ORDER BY COALESCE(u.last_active_at, u.updated_at, u.created_at, NOW()) DESC, u.created_at DESC
LIMIT 250
`

	rows, err := c.data.DB.Query(ctx, query, model.UserStatusActive)
	if err != nil {
		return nil, fmt.Errorf("query community map points: %w", err)
	}
	defer rows.Close()

	points := make([]*model.CommunityMapPoint, 0, 64)
	for rows.Next() {
		var point model.CommunityMapPoint
		if err := rows.Scan(
			&point.UserID,
			&point.Title,
			&point.Region,
			&point.Latitude,
			&point.Longitude,
			&point.AvatarURL,
			&point.Username,
			&point.FirstName,
			&point.LastName,
			&point.ActivityStatus,
		); err != nil {
			return nil, fmt.Errorf("scan community map point: %w", err)
		}
		point.IsCurrentUser = currentUserID != "" && currentUserID == point.UserID
		points = append(points, &point)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate community map points: %w", err)
	}

	return points, nil
}
