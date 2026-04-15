package profile

import (
	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
)

func mapActivityStatus(status model.UserActivityStatus) commonv1.UserActivityStatus {
	switch status {
	case model.UserActivityStatusOnline:
		return commonv1.UserActivityStatus_USER_ACTIVITY_STATUS_ONLINE
	case model.UserActivityStatusRecentlyActive:
		return commonv1.UserActivityStatus_USER_ACTIVITY_STATUS_RECENTLY_ACTIVE
	case model.UserActivityStatusOffline:
		return commonv1.UserActivityStatus_USER_ACTIVITY_STATUS_OFFLINE
	default:
		return commonv1.UserActivityStatus_USER_ACTIVITY_STATUS_UNSPECIFIED
	}
}
