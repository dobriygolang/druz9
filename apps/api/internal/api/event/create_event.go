package event

import (
	"context"
	"time"

	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateEvent(ctx context.Context, req *v1.CreateEventRequest) (*v1.EventResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	if !user.IsAdmin {
		return nil, errors.Forbidden("FORBIDDEN", "forbidden")
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		value := req.ScheduledAt.AsTime()
		scheduledAt = &value
	}

	event, err := i.service.CreateEvent(ctx, user.ID, model.CreateEventRequest{
		Title:          req.Title,
		PlaceLabel:     req.PlaceLabel,
		Description:    req.Description,
		Repeat:         unmapEventRepeat(req.Repeat),
		MeetingLink:    req.MeetingLink,
		Region:         req.Region,
		Country:        req.Country,
		City:           req.City,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		ScheduledAt:    scheduledAt,
		InvitedUserIDs: req.InvitedUserIds,
		IsPublic:       req.IsPublic,
	})
	if err != nil {
		return nil, err
	}
	return &v1.EventResponse{Event: mapEvent(event)}, nil
}
