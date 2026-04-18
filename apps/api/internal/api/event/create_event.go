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
	if req.GetScheduledAt() != nil {
		value := timeutil.NormalizeToUTC(req.GetScheduledAt().AsTime())
		scheduledAt = &value
	}

	event, err := i.service.CreateEvent(ctx, user.ID, user.IsAdmin, model.CreateEventRequest{
		Title:          req.GetTitle(),
		PlaceLabel:     req.GetPlaceLabel(),
		Description:    req.GetDescription(),
		Repeat:         unmapEventRepeat(req.GetRepeat()),
		MeetingLink:    req.GetMeetingLink(),
		Region:         req.GetRegion(),
		Country:        req.GetCountry(),
		City:           req.GetCity(),
		Latitude:       req.GetLatitude(),
		Longitude:      req.GetLongitude(),
		ScheduledAt:    scheduledAt,
		InvitedUserIDs: req.GetInvitedUserIds(),
		IsPublic:       req.GetIsPublic(),
	})
	if err != nil {
		return nil, err
	}
	return &v1.EventResponse{Event: mapEvent(event)}, nil
}
