package hub

import (
	"context"
	"fmt"

	hubservice "api/internal/api/hub"
	"api/internal/storage/postgres"
)

type RegionStatsRepo struct {
	store *postgres.Store
}

func NewRegionStatsRepo(store *postgres.Store) *RegionStatsRepo {
	return &RegionStatsRepo{store: store}
}

func (r *RegionStatsRepo) GetRegionStats(ctx context.Context, regionID string) (hubservice.RegionStats, error) {
	var stats hubservice.RegionStats
	if r == nil || r.store == nil {
		return stats, nil
	}
	if err := r.store.DB.QueryRow(ctx, `
SELECT
  (SELECT COUNT(*) FROM guilds WHERE region_tag = $1 AND is_public = TRUE)::int,
  (SELECT COUNT(*) FROM events WHERE region_tag = $1 AND is_public = TRUE AND status = 'approved' AND (scheduled_at IS NULL OR scheduled_at >= NOW() - INTERVAL '12 hours'))::int,
  (SELECT COUNT(*) FROM podcasts WHERE region_tag = $1 AND object_key IS NOT NULL AND object_key <> '')::int
`, regionID).Scan(&stats.ActiveGuilds, &stats.OpenEvents, &stats.Podcasts); err != nil {
		return stats, fmt.Errorf("get region stats: %w", err)
	}
	return stats, nil
}

var _ hubservice.RegionStatsRepository = (*RegionStatsRepo)(nil)
