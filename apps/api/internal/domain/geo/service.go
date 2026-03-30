package geo

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
//
//go:generate mockery --case underscore --name Resolver --with-expecter --output mocks
type Resolver interface {
	Resolve(ctx context.Context, query string, limit int) ([]*model.GeoCandidate, error)
	ListCommunityPoints(
		ctx context.Context,
		currentUserID string,
	) ([]*model.CommunityMapPoint, error)
}

// NewService creates new geo domain service.
func NewService(c Config) *Service {
	return &Service{
		resolver: c.Resolver,
	}
}

// NewGeoService is an alias for NewService for backward compatibility.
var NewGeoService = NewService
