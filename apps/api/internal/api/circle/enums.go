package circle

import v1 "api/pkg/api/circle/v1"

func mapCircleMemberRole(role string) v1.CircleMemberRole {
	switch role {
	case "creator":
		return v1.CircleMemberRole_CIRCLE_MEMBER_ROLE_CREATOR
	case "member":
		return v1.CircleMemberRole_CIRCLE_MEMBER_ROLE_MEMBER
	default:
		return v1.CircleMemberRole_CIRCLE_MEMBER_ROLE_UNSPECIFIED
	}
}

func mapCircleActionType(actionType string) v1.CircleMemberActionType {
	switch actionType {
	case "daily":
		return v1.CircleMemberActionType_CIRCLE_MEMBER_ACTION_TYPE_DAILY
	case "duel":
		return v1.CircleMemberActionType_CIRCLE_MEMBER_ACTION_TYPE_DUEL
	case "mock":
		return v1.CircleMemberActionType_CIRCLE_MEMBER_ACTION_TYPE_MOCK
	default:
		return v1.CircleMemberActionType_CIRCLE_MEMBER_ACTION_TYPE_UNSPECIFIED
	}
}
