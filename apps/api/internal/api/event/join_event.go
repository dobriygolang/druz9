package event

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) JoinEvent(ctx context.Context, req *v1.JoinEventRequest) (*v1.EventResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	eventID, err := uuid.Parse(req.EventId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_EVENT_ID", "invalid event id")
	}

	event, err := i.service.JoinEvent(ctx, eventID, user.ID)
	if err != nil {
		return nil, err
	}
	return &v1.EventResponse{Event: mapEvent(event)}, nil
}
