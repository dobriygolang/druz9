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
	// ListWorldPins aggregates guild halls + upcoming events into a single
	// list of map markers for the world-map page.
	ListWorldPins(ctx context.Context) ([]*model.WorldPin, error)
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

// WorldPins proxies to the resolver. Kept as a domain method so callers
// depend on geodomain.Service (not directly on the data layer).
func (s *Service) WorldPins(ctx context.Context) ([]*model.WorldPin, error) {
	return s.resolver.ListWorldPins(ctx)
}
