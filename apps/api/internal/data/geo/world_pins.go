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
        ) t
        ORDER BY is_hot DESC, kind ASC
        LIMIT 500
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
	return pins, rows.Err()
}

