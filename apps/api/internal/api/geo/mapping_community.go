package geo

import (
	"api/internal/model"
	v1 "api/pkg/api/geo/v1"
)

func mapCommunityMapResponse(resp *model.CommunityMapResponse) *v1.CommunityMapResponse {
	if resp == nil {
		return nil
	}

	points := make([]*v1.CommunityMapPoint, 0, len(resp.Points))
	for _, point := range resp.Points {
		if point == nil {
			continue
		}

		avatarURL := point.AvatarURL
		points = append(points, &v1.CommunityMapPoint{
			UserId:           point.UserID,
			Title:            point.Title,
			Region:           point.Region,
			Latitude:         point.Latitude,
			Longitude:        point.Longitude,
			IsCurrentUser:    point.IsCurrentUser,
			AvatarUrl:        avatarURL,
			Username:         point.Username,
			FirstName:        point.FirstName,
			LastName:         point.LastName,
			ActivityStatus:   mapActivityStatus(point.ActivityStatus),
			TelegramUsername: point.TelegramUsername,
		})
	}

	return &v1.CommunityMapResponse{Points: points}
}
