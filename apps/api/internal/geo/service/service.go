package service

import (
	"context"

	"api/internal/model"
)

// Resolver represents geo data layer needed by this service.
type Config struct {
	Resolver Resolver
}

type Service struct {
	resolver Resolver
}

// Resolver is a data-layer interface for geo queries.
type Resolver interface {
	Resolve(ctx context.Context, query string, limit int) ([]*model.GeoCandidate, error)
	ListCommunityPoints(
		ctx context.Context,
		currentUserID string,
	) ([]*model.CommunityMapPoint, error)
}

// NewGeoService creates new geo domain service.
func NewGeoService(c Config) *Service {
	return &Service{
		resolver: c.Resolver,
	}
}
