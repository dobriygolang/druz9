package event

import (
	"context"

	v1 "api/pkg/api/event/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) InviteToEvent(ctx context.Context, req *v1.InviteToEventRequest) (*v1.EventStatusResponse, error) {
	eventID, err := uuid.Parse(req.EventId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_EVENT_ID", "invalid event_id")
	}
	inviteeID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user_id")
	}
	if _, err := i.service.JoinEvent(ctx, eventID, inviteeID); err != nil {
		return nil, err
	}
	return &v1.EventStatusResponse{Status: "invited"}, nil
}
