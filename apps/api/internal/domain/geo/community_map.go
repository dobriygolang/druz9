package geo

import (
	"context"

	"api/internal/model"
	geoerrors "api/internal/errors/geo"
)

// CommunityMap implements internal/api/geo service interface.
func (s *Service) CommunityMap(
	ctx context.Context,
	currentUserID string,
) (*model.CommunityMapResponse, error) {
	if s.resolver == nil {
		return nil, geoerrors.ErrResolve
	}

	points, err := s.resolver.ListCommunityPoints(ctx, currentUserID)
	if err != nil {
		return nil, err
	}

	return &model.CommunityMapResponse{Points: points}, nil
}
