package geo

import (
	"api/internal/model"
	v1 "api/pkg/api/geo/v1"
)

func mapResolveResponse(resp *model.GeoResolveResponse) *v1.ResolveResponse {
	if resp == nil {
		return nil
	}

	candidates := make([]*v1.GeoCandidate, 0, len(resp.Candidates))
	for _, candidate := range resp.Candidates {
		if candidate == nil {
			continue
		}
		candidates = append(candidates, &v1.GeoCandidate{
			Region:      candidate.Region,
			Country:     candidate.Country,
			City:        candidate.City,
			Latitude:    candidate.Latitude,
			Longitude:   candidate.Longitude,
			DisplayName: candidate.DisplayName,
		})
	}

	return &v1.ResolveResponse{Candidates: candidates}
}

func mapActivityStatus(status string) v1.UserActivityStatus {
	switch model.UserActivityStatusFromString(status) {
	case model.UserActivityStatusOnline:
		return v1.UserActivityStatus_USER_ACTIVITY_STATUS_ONLINE
	case model.UserActivityStatusRecentlyActive:
		return v1.UserActivityStatus_USER_ACTIVITY_STATUS_RECENTLY_ACTIVE
	case model.UserActivityStatusOffline:
		return v1.UserActivityStatus_USER_ACTIVITY_STATUS_OFFLINE
	default:
		return v1.UserActivityStatus_USER_ACTIVITY_STATUS_UNSPECIFIED
	}
}

func mapCommunityMapResponse(resp *model.CommunityMapResponse) *v1.CommunityMapResponse {
	if resp == nil {
		return nil
	}

	points := make([]*v1.CommunityMapPoint, 0, len(resp.Points))
	for _, point := range resp.Points {
		if point == nil {
			continue
		}
		points = append(points, &v1.CommunityMapPoint{
			UserId:           point.UserID,
			Title:            point.Title,
			Region:           point.Region,
			Latitude:         point.Latitude,
			Longitude:        point.Longitude,
			IsCurrentUser:    point.IsCurrentUser,
			AvatarUrl:        point.AvatarURL,
			TelegramUsername: point.TelegramUsername,
			FirstName:        point.FirstName,
			LastName:         point.LastName,
			ActivityStatus:   mapActivityStatus(point.ActivityStatus),
		})
	}

	return &v1.CommunityMapResponse{Points: points}
}
