package circle

import (
	"context"
	"time"

	"api/internal/model"
	"api/internal/util/timeutil"
	circlev1 "api/pkg/api/circle/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) CreateCircleEvent(ctx context.Context, req *circlev1.CreateCircleEventRequest) (*circlev1.CreateCircleEventResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, kratosErrors.Unauthorized("UNAUTHORIZED", "authentication required")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	isMember, err := i.service.IsMember(ctx, circleID, user.ID)
	if err != nil || !isMember {
		return nil, kratosErrors.Forbidden("NOT_A_MEMBER", "must be a circle member")
	}

	if req.Title == "" {
		return nil, kratosErrors.BadRequest("INVALID_TITLE", "title is required")
	}
	var scheduledAt *time.Time
	if req.ScheduledAt != "" {
		value, err := timeutil.ParseMoscowDateTime(req.ScheduledAt)
		if err != nil || !value.After(time.Now().UTC()) {
			return nil, kratosErrors.BadRequest("INVALID_SCHEDULED_AT", "scheduledAt must be a future Moscow timestamp")
		}
		scheduledAt = &value
	}

	event, err := i.eventSvc.CreateEvent(ctx, user.ID, model.CreateEventRequest{
		Title:       req.Title,
		Description: req.Description,
		MeetingLink: req.MeetingLink,
		PlaceLabel:  req.PlaceLabel,
		ScheduledAt: scheduledAt,
		Repeat:      req.Repeat,
		CircleID:    &circleID,
	})
	if err != nil {
		return nil, err
	}
	return &circlev1.CreateCircleEventResponse{Event: mapCircleEvent(event)}, nil
}
