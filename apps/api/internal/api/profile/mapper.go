package profile

import (
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapProfileResponse(resp *model.ProfileResponse) *v1.ProfileResponse {
	if resp == nil || resp.User == nil {
		return nil
	}
	u := resp.User
	return &v1.ProfileResponse{
		User: &v1.User{
			Id:               u.ID.String(),
			TelegramId:       u.TelegramID,
			TelegramUsername: u.TelegramUsername,
			FirstName:        u.FirstName,
			LastName:         u.LastName,
			AvatarUrl:        u.AvatarURL,
			CurrentWorkplace: u.CurrentWorkplace,
			Region:           u.Region,
			Latitude:         u.Geo.Latitude,
			Longitude:        u.Geo.Longitude,
			ActivityStatus:   u.ActivityStatus,
			IsAdmin:          u.IsAdmin,
			CreatedAt:        timestamppb.New(u.CreatedAt),
			UpdatedAt:        timestamppb.New(u.UpdatedAt),
		},
		NeedsProfileComplete: resp.NeedsProfileComplete,
	}
}
