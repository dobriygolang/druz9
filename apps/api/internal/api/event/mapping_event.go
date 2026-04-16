package event

import (
	"math"

	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapEvent(item *model.Event) *v1.Event {
	if item == nil {
		return nil
	}

	participants := make([]*v1.EventParticipant, 0, len(item.Participants))
	for _, participant := range item.Participants {
		if participant == nil {
			continue
		}
		participants = append(participants, &v1.EventParticipant{
			UserId:      participant.UserID,
			DisplayName: participant.Title,
			AvatarUrl:   participant.AvatarURL,
			Status:      mapParticipantStatus(participant.Status),
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

	event := &v1.Event{
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
		CreatedAt:        timestamppb.New(item.CreatedAt),
		CreatorId:        item.CreatorID,
		CreatorName:      item.CreatorName,
		IsCreator:        item.IsCreator,
		IsJoined:         item.IsJoined,
		IsPublic:         item.IsPublic,
		ParticipantCount: participantCount,
		Participants:     participants,
		Status:           item.Status,
	}
	if item.ScheduledAt != nil {
		event.ScheduledAt = timestamppb.New(*item.ScheduledAt)
	}
	return event
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
