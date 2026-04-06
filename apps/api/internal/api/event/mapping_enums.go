package event

import (
	"api/internal/model"
	v1 "api/pkg/api/event/v1"
)

func mapParticipantStatus(status model.EventParticipantStatus) v1.ParticipantStatus {
	switch status {
	case model.EventParticipantStatusPending:
		return v1.ParticipantStatus_PARTICIPANT_STATUS_PENDING
	case model.EventParticipantStatusConfirmed:
		return v1.ParticipantStatus_PARTICIPANT_STATUS_CONFIRMED
	case model.EventParticipantStatusDeclined:
		return v1.ParticipantStatus_PARTICIPANT_STATUS_DECLINED
	default:
		return v1.ParticipantStatus_PARTICIPANT_STATUS_UNSPECIFIED
	}
}

func mapEventListFilter(filter v1.EventListFilter) string {
	switch filter {
	case v1.EventListFilter_EVENT_LIST_FILTER_UPCOMING:
		return "upcoming"
	case v1.EventListFilter_EVENT_LIST_FILTER_PAST:
		return "past"
	default:
		return ""
	}
}

// unmapEventRepeat converts the proto enum to the string constant used by the domain.
func unmapEventRepeat(repeat v1.EventRepeat) string {
	switch repeat {
	case v1.EventRepeat_EVENT_REPEAT_DAILY:
		return model.EventRepeatDaily
	case v1.EventRepeat_EVENT_REPEAT_WEEKLY:
		return model.EventRepeatWeekly
	case v1.EventRepeat_EVENT_REPEAT_MONTHLY:
		return model.EventRepeatMonthly
	default:
		return model.EventRepeatNone
	}
}

// unmapDeleteEventScope converts the proto enum to the string used by the domain context.
func unmapDeleteEventScope(scope v1.DeleteEventScope) string {
	switch scope {
	case v1.DeleteEventScope_DELETE_EVENT_SCOPE_SINGLE:
		return "single"
	case v1.DeleteEventScope_DELETE_EVENT_SCOPE_FUTURE:
		return "future"
	case v1.DeleteEventScope_DELETE_EVENT_SCOPE_ALL:
		return "all"
	default:
		return "single"
	}
}
