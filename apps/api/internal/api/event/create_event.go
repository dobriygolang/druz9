package event

import (
	"context"
	"time"

	"api/internal/apihelpers"
	"api/internal/model"
	"api/internal/util/timeutil"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) CreateEvent(ctx context.Context, req *v1.CreateEventRequest) (*v1.EventResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		value := timeutil.NormalizeToUTC(req.ScheduledAt.AsTime())
		scheduledAt = &value
	}

	event, err := i.service.CreateEvent(ctx, user.ID, user.IsAdmin, model.CreateEventRequest{
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
