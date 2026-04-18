package event

import (
	"context"

	"api/internal/apihelpers"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) JoinEvent(ctx context.Context, req *v1.JoinEventRequest) (*v1.EventResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	eventID, err := apihelpers.ParseUUID(req.GetEventId(), "INVALID_EVENT_ID", "event_id")
	if err != nil {
		return nil, err
	}

	event, err := i.service.JoinEvent(ctx, eventID, user.ID)
	if err != nil {
		return nil, err
	}
	return &v1.EventResponse{Event: mapEvent(event)}, nil
}
