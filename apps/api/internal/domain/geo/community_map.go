package geo

import (
	"context"
	"fmt"
	"time"

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

	// Try cache first (key includes currentUserID to differentiate guests)
	cacheKey := "community:" + currentUserID
	if s.communityCache != nil {
		if points, ok := s.communityCache.Get(cacheKey); ok {
			// Update activity status from live cache
			s.enrichActivityStatus(points)
			return &model.CommunityMapResponse{Points: points}, nil
		}
	}

	points, err := s.resolver.ListCommunityPoints(ctx, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("list community points: %w", err)
	}

	// Cache the result
	if s.communityCache != nil {
		s.communityCache.Set(cacheKey, points)
	}

	// Override activity status from cache (in-memory, more accurate)
	s.enrichActivityStatus(points)

	return &model.CommunityMapResponse{Points: points}, nil
}

// enrichActivityStatus updates activity status from live cache.
// Optimized to use batch cache lookup.
func (s *Service) enrichActivityStatus(points []*model.CommunityMapPoint) {
	if s.activityCache == nil || len(points) == 0 {
		return
	}

	// Collect all user IDs
	userIDs := make([]string, 0, len(points))
	for _, point := range points {
		if point.UserID != "" {
			userIDs = append(userIDs, point.UserID)
		}
	}

	if len(userIDs) == 0 {
		return
	}

	// Batch cache lookup
	activities := s.activityCache.GetMultiple(userIDs)
	if len(activities) == 0 {
		return
	}

	now := time.Now().UTC()
	for _, point := range points {
		if point.UserID == "" {
			continue
		}
		if lastActive, ok := activities[point.UserID]; ok {
			point.ActivityStatus = model.ResolveActivityStatus(lastActive, now).String()
		}
	}
}

// InvalidateCommunityCache clears the community map cache.
func (s *Service) InvalidateCommunityCache() {
	if s.communityCache != nil {
		s.communityCache.Delete("community:")
		// Also delete known guest variations (simple approach)
		s.communityCache.Delete("community:guest")
	}
}
