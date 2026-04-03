package profile

import (
	"api/internal/model"
	profilev1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapProfileResponse(resp *model.ProfileResponse) *profilev1.ProfileResponse {
	if resp == nil || resp.User == nil {
		return nil
	}
	return &profilev1.ProfileResponse{
		User:                 mapUser(resp.User),
		NeedsProfileComplete: resp.NeedsProfileComplete,
	}
}

func mapUser(user *model.User) *profilev1.User {
	if user == nil {
		return nil
	}

	return &profilev1.User{
		Id:                 user.ID.String(),
		Username:           user.Username,
		TelegramUsername:   user.TelegramUsername,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		AvatarUrl:          user.AvatarURL,
		CurrentWorkplace:   user.CurrentWorkplace,
		Region:             user.Geo.Region,
		Latitude:           user.Geo.Latitude,
		Longitude:          user.Geo.Longitude,
		ActivityStatus:     mapActivityStatus(user.ActivityStatus),
		IsAdmin:            user.IsAdmin,
		IsTrusted:          user.IsTrusted,
		ConnectedProviders: user.ConnectedProviders,
		PrimaryProvider:    user.PrimaryProvider,
		CreatedAt:          timestamppb.New(user.CreatedAt),
	}
}
