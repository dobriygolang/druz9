package profile

import (
	"api/internal/model"
	profilev1 "api/pkg/api/profile/v1"
)

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
