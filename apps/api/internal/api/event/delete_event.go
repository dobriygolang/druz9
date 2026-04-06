package event

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeleteEvent(ctx context.Context, req *v1.DeleteEventRequest) (*v1.EventStatusResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	eventID, err := uuid.Parse(req.EventId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_EVENT_ID", "invalid event id")
	}
	ctx = model.ContextWithEventDeleteScope(ctx, unmapDeleteEventScope(req.DeleteScope))
	if err := i.service.DeleteEvent(ctx, eventID, user); err != nil {
		return nil, err
	}
	return &v1.EventStatusResponse{Status: "ok"}, nil
}
