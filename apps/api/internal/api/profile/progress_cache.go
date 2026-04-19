package profile

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"api/internal/cache"
	"api/internal/model"
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
		return nil, fmt.Errorf("get profile progress: %w", err)
	}

	c.cache.Set(key, progress)
	return progress, nil
}

func (c *CachedProgressRepository) SaveUserGoal(ctx context.Context, userID uuid.UUID, goal *model.UserGoal) error {
	if err := c.inner.SaveUserGoal(ctx, userID, goal); err != nil {
		return fmt.Errorf("save user goal: %w", err)
	}
	return nil
}

func (c *CachedProgressRepository) GetProfileFeed(ctx context.Context, userID uuid.UUID, limit int) ([]*model.FeedItem, error) {
	items, err := c.inner.GetProfileFeed(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("get profile feed: %w", err)
	}
	return items, nil
}
