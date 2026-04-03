package geo

import (
	"context"
	"sync"
	"time"

	"api/internal/cache"
	"api/internal/model"
)

// Config represents geo domain service configuration.
type Config struct {
	Resolver      Resolver
	ActivityCache *cache.TTLCache[time.Time]
}

// Resolver is a data-layer interface for geo queries.
//
//go:generate mockery --case underscore --name Resolver --with-expecter --output mocks
type Resolver interface {
	Resolve(ctx context.Context, query string, limit int) ([]*model.GeoCandidate, error)
	ListCommunityPoints(
		ctx context.Context,
		currentUserID string,
	) ([]*model.CommunityMapPoint, error)
}

// Service implements geo domain logic.
type Service struct {
	resolver       Resolver
	activityCache  *cache.TTLCache[time.Time]
	communityCache *cache.TTLCache[[]*model.CommunityMapPoint]
	communityMu    sync.RWMutex
}

// NewService creates new geo domain service.
func NewService(c Config) *Service {
	return &Service{
		resolver:       c.Resolver,
		activityCache:  c.ActivityCache,
		communityCache: cache.NewTTLCache[[]*model.CommunityMapPoint](5, 1*time.Minute),
	}
}

// NewGeoService is an alias for NewService for backward compatibility.
var NewGeoService = NewService

func (s *Service) EnrichCommunityMapWithAvatarURLs(ctx context.Context, response *model.CommunityMapResponse) error {
	_ = ctx
	_ = response
	return nil
}
