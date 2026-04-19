package geo

import (
	"context"
	"fmt"

	"api/internal/model"
)

// ListWorldPins aggregates map pins across guilds + upcoming events. Both
// tables keep lat/lon columns; we just UNION them into a single response.
//
// The query union is ordered by hot-ness: guilds that the user is in and
// events starting in the next 24h are flagged `is_hot=true` so the client
// can render them in an accented color.
func (r *Repo) ListWorldPins(ctx context.Context) ([]*model.WorldPin, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT * FROM (
            SELECT
                'guild:' || g.id::text                         AS id,
                1                                              AS kind,
                g.name                                         AS title,
                COALESCE(g.member_count, 0)::text || ' members' AS subtitle,
                COALESCE(g.latitude, 0)                        AS latitude,
                COALESCE(g.longitude, 0)                       AS longitude,
                COALESCE(g.region, '')                         AS region,
                'banner'                                       AS icon_ref,
                '/guild'                                       AS link_path,
                FALSE                                          AS is_hot
            FROM guilds g
            WHERE g.latitude IS NOT NULL AND g.longitude IS NOT NULL
              AND g.latitude <> 0 AND g.longitude <> 0

            UNION ALL

            SELECT
                'event:' || e.id::text                         AS id,
                2                                              AS kind,
                e.title                                        AS title,
                COALESCE(e.place_label, e.city, e.region, '')  AS subtitle,
                e.latitude                                     AS latitude,
                e.longitude                                    AS longitude,
                COALESCE(e.region, '')                         AS region,
                'scroll'                                       AS icon_ref,
                '/events'                                      AS link_path,
                (e.scheduled_at IS NOT NULL AND e.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours')
                                                               AS is_hot
            FROM events e
            WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
              AND e.latitude <> 0 AND e.longitude <> 0
              AND (e.scheduled_at IS NULL OR e.scheduled_at >= NOW() - INTERVAL '1 day')

            UNION ALL

            -- Users with an active profile and a geo row. Capped at 300 so
            -- a dense metropolis doesn't dominate the pin layer. Online
            -- users are flagged is_hot so they render in the accent color.
            (SELECT
                'user:' || u.id::text                                            AS id,
                3                                                                AS kind,
                COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.username, ''), 'druz9 hero') AS title,
                COALESCE(g2.region, '')                                          AS subtitle,
                g2.latitude                                                      AS latitude,
                g2.longitude                                                     AS longitude,
                COALESCE(g2.region, '')                                          AS region,
                'hero'                                                           AS icon_ref,
                '/profile/' || u.id::text                                        AS link_path,
                (COALESCE(u.last_active_at, u.updated_at, u.created_at) >= NOW() - INTERVAL '2 minutes') AS is_hot
            FROM users u
            JOIN geo g2 ON g2.user_id = u.id
            WHERE u.status = 2
              AND g2.latitude IS NOT NULL AND g2.longitude IS NOT NULL
              AND g2.latitude <> 0 AND g2.longitude <> 0
            ORDER BY COALESCE(u.last_active_at, u.updated_at, u.created_at) DESC NULLS LAST
            LIMIT 300)
        ) t
        ORDER BY is_hot DESC, kind ASC
        LIMIT 800
    `)
	if err != nil {
		return nil, fmt.Errorf("list world pins: %w", err)
	}
	defer rows.Close()

	pins := make([]*model.WorldPin, 0, 64)
	for rows.Next() {
		p := &model.WorldPin{}
		var kind int32
		if err := rows.Scan(&p.ID, &kind, &p.Title, &p.Subtitle, &p.Latitude, &p.Longitude, &p.Region, &p.IconRef, &p.LinkPath, &p.IsHot); err != nil {
			return nil, fmt.Errorf("scan world pin: %w", err)
		}
		p.Kind = model.WorldPinKind(kind)
		pins = append(pins, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate world pins: %w", err)
	}
	return pins, nil
}
