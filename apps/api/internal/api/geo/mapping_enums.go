package geo

import (
	"api/internal/model"
	v1 "api/pkg/api/geo/v1"
)

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
