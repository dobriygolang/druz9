package event

import (
	"context"
	"time"

	"api/internal/apihelpers"
	"api/internal/model"
	"api/internal/util/timeutil"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) UpdateEvent(ctx context.Context, req *v1.UpdateEventRequest) (*v1.EventResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	eventID, err := apihelpers.ParseUUID(req.EventId, "INVALID_EVENT_ID", "event_id")
	if err != nil {
		return nil, err
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		value := timeutil.NormalizeToUTC(req.ScheduledAt.AsTime())
		scheduledAt = &value
	}

	event, err := i.service.UpdateEvent(ctx, eventID, user, model.UpdateEventRequest{
		Title:          req.Title,
		PlaceLabel:     req.PlaceLabel,
		Description:    req.Description,
		MeetingLink:    req.MeetingLink,
		Region:         req.Region,
		Country:        req.Country,
		City:           req.City,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		ScheduledAt:    scheduledAt,
		InvitedUserIDs: req.InvitedUserIds,
	})
	if err != nil {
		return nil, err
	}
	return &v1.EventResponse{Event: mapEvent(event)}, nil
}
