package circle

import (
	"context"
	"math"

	"api/internal/model"
	circlev1 "api/pkg/api/circle/v1"
	eventv1 "api/pkg/api/event/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) ListCircleEvents(ctx context.Context, req *circlev1.ListCircleEventsRequest) (*circlev1.ListCircleEventsResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, kratosErrors.Unauthorized("UNAUTHORIZED", "authentication required")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	resp, err := i.eventSvc.ListEvents(ctx, user.ID, model.ListEventsOptions{
		Limit:    20,
		CircleID: &circleID,
		Status:   req.Status,
	})
	if err != nil {
		return nil, err
	}

	events := make([]*eventv1.Event, 0, len(resp.Events))
	for _, e := range resp.Events {
		if e == nil {
			continue
		}
		events = append(events, mapCircleEvent(e))
	}
	return &circlev1.ListCircleEventsResponse{Events: events}, nil
}

func mapCircleEvent(item *model.Event) *eventv1.Event {
	if item == nil {
		return nil
	}
	participantCount := uint32(0)
	if item.ParticipantCount > 0 && item.ParticipantCount <= math.MaxUint32 {
		participantCount = uint32(item.ParticipantCount)
	}
	event := &eventv1.Event{
		Id:               item.ID.String(),
		Title:            item.Title,
		Description:      item.Description,
		MeetingLink:      item.MeetingLink,
		PlaceLabel:       item.PlaceLabel,
		CreatedAt:        timestamppb.New(item.CreatedAt),
		CreatorId:        item.CreatorID,
		CreatorName:      item.CreatorName,
		IsCreator:        item.IsCreator,
		IsJoined:         item.IsJoined,
		IsPublic:         item.IsPublic,
		ParticipantCount: participantCount,
	}
	if item.ScheduledAt != nil {
		event.ScheduledAt = timestamppb.New(*item.ScheduledAt)
	}
	return event
}
