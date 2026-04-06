package event

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) LeaveEvent(ctx context.Context, req *v1.LeaveEventRequest) (*v1.EventStatusResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	eventID, err := uuid.Parse(req.EventId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_EVENT_ID", "invalid event id")
	}

	if err := i.service.LeaveEvent(ctx, eventID, user.ID); err != nil {
		return nil, errors.BadRequest("LEAVE_EVENT_FAILED", err.Error())
	}
	return &v1.EventStatusResponse{Status: "ok"}, nil
}
