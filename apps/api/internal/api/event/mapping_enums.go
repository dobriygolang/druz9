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
