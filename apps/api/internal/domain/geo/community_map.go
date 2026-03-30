package geo

import (
	"context"

	geoerrors "api/internal/errors/geo"
	"api/internal/model"
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
