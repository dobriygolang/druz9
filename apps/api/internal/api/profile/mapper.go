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
	u := resp.User
	return &profilev1.ProfileResponse{
		User: &profilev1.User{
			Id:               u.ID.String(),
			TelegramId:       u.TelegramID,
			TelegramUsername: u.TelegramUsername,
			FirstName:        u.FirstName,
			LastName:         u.LastName,
			AvatarUrl:        u.AvatarURL,
			CurrentWorkplace: u.CurrentWorkplace,
			Region:           u.Geo.Region,
			Latitude:         u.Geo.Latitude,
			Longitude:        u.Geo.Longitude,
			ActivityStatus:   mapActivityStatus(u.ActivityStatus),
			IsAdmin:          u.IsAdmin,
			CreatedAt:        timestamppb.New(u.CreatedAt),
			UpdatedAt:        timestamppb.New(u.UpdatedAt),
		},
		NeedsProfileComplete: resp.NeedsProfileComplete,
	}
}

func mapActivityStatus(status model.UserActivityStatus) profilev1.UserActivityStatus {
	switch status {
	case model.UserActivityStatusOnline:
		return profilev1.UserActivityStatus_USER_ACTIVITY_STATUS_ONLINE
	case model.UserActivityStatusRecentlyActive:
		return profilev1.UserActivityStatus_USER_ACTIVITY_STATUS_RECENTLY_ACTIVE
	case model.UserActivityStatusOffline:
		return profilev1.UserActivityStatus_USER_ACTIVITY_STATUS_OFFLINE
	default:
		return profilev1.UserActivityStatus_USER_ACTIVITY_STATUS_UNSPECIFIED
	}
}
