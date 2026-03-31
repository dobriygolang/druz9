package event

import (
	"api/internal/model"
	v1 "api/pkg/api/event/v1"
	"math"

	"google.golang.org/protobuf/types/known/timestamppb"
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

func mapEvent(item *model.Event) *v1.Event {
	if item == nil {
		return nil
	}

	participants := make([]*v1.EventParticipant, 0, len(item.Participants))
	for _, participant := range item.Participants {
		if participant == nil {
			continue
		}
		// S3 avatar has priority, fallback to Telegram avatar
		avatarURL := participant.AvatarURL
		if avatarURL == "" {
			avatarURL = participant.TelegramAvatarURL
		}
		participants = append(participants, &v1.EventParticipant{
			UserId:            participant.UserID,
			Title:             participant.Title,
			AvatarUrl:         avatarURL,
			TelegramAvatarUrl: participant.TelegramAvatarURL,
			TelegramUsername:  participant.TelegramUsername,
			FirstName:         participant.FirstName,
			LastName:          participant.LastName,
			Status:            mapParticipantStatus(participant.Status),
		})
	}

	participantCount := uint32(0)
	if item.ParticipantCount > 0 {
		if item.ParticipantCount > math.MaxUint32 {
			participantCount = math.MaxUint32
		} else {
			participantCount = uint32(item.ParticipantCount)
		}
	}

	return &v1.Event{
		Id:               item.ID.String(),
		Title:            item.Title,
		PlaceLabel:       item.PlaceLabel,
		Description:      item.Description,
		MeetingLink:      item.MeetingLink,
		Region:           item.Region,
		Country:          item.Country,
		City:             item.City,
		Latitude:         item.Latitude,
		Longitude:        item.Longitude,
		ScheduledAt:      timestamppb.New(item.ScheduledAt),
		CreatedAt:        timestamppb.New(item.CreatedAt),
		CreatorId:        item.CreatorID,
		CreatorName:      item.CreatorName,
		IsCreator:        item.IsCreator,
		IsJoined:         item.IsJoined,
		ParticipantCount: participantCount,
		Participants:     participants,
	}
}

func mapListEventsResponse(resp *model.ListEventsResponse) *v1.ListEventsResponse {
	if resp == nil {
		return nil
	}

	events := make([]*v1.Event, 0, len(resp.Events))
	for _, item := range resp.Events {
		if item == nil {
			continue
		}
		events = append(events, mapEvent(item))
	}
	return &v1.ListEventsResponse{
		Events:      events,
		Limit:       resp.Limit,
		Offset:      resp.Offset,
		TotalCount:  resp.TotalCount,
		HasNextPage: resp.HasNextPage,
	}
}
