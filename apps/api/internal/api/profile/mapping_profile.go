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

	avatarURL := user.AvatarURL
	if avatarURL == "" {
		avatarURL = user.TelegramAvatarURL
	}

	return &profilev1.User{
		Id:                user.ID.String(),
		TelegramId:        user.TelegramID,
		TelegramUsername:  user.TelegramUsername,
		FirstName:         user.FirstName,
		LastName:          user.LastName,
		AvatarUrl:         avatarURL,
		TelegramAvatarUrl: user.TelegramAvatarURL,
		CurrentWorkplace:  user.CurrentWorkplace,
		Region:            user.Geo.Region,
		Latitude:          user.Geo.Latitude,
		Longitude:         user.Geo.Longitude,
		ActivityStatus:    mapActivityStatus(user.ActivityStatus),
		IsAdmin:           user.IsAdmin,
		IsTrusted:         user.IsTrusted,
		CreatedAt:         timestamppb.New(user.CreatedAt),
		UpdatedAt:         timestamppb.New(user.UpdatedAt),
	}
}
