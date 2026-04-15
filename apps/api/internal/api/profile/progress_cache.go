package profile

import (
	"context"
	"time"

	"api/internal/cache"
	"api/internal/model"

	"github.com/google/uuid"
)

// CachedProgressRepository wraps ProgressRepository with TTL caching
// for GetProfileProgress (7 DB queries per call).
type CachedProgressRepository struct {
	inner ProgressRepository
	cache *cache.TTLCache[*model.ProfileProgress]
}

// NewCachedProgressRepository creates a caching wrapper around ProgressRepository.
func NewCachedProgressRepository(inner ProgressRepository) *CachedProgressRepository {
	return &CachedProgressRepository{
		inner: inner,
		cache: cache.NewTTLCache[*model.ProfileProgress](500, 5*time.Minute),
	}
}

func (c *CachedProgressRepository) GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error) {
	key := userID.String()
	if cached, ok := c.cache.Get(key); ok {
		return cached, nil
	}

	progress, err := c.inner.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, err
	}

	c.cache.Set(key, progress)
	return progress, nil
}

func (c *CachedProgressRepository) GetDailyActivity(ctx context.Context, userID uuid.UUID, days int) (map[string]int, error) {
	return c.inner.GetDailyActivity(ctx, userID, days)
}
