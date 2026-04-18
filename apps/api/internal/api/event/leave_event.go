package event

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) LeaveEvent(ctx context.Context, req *v1.LeaveEventRequest) (*v1.EventStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	eventID, err := apihelpers.ParseUUID(req.GetEventId(), "INVALID_EVENT_ID", "event_id")
	if err != nil {
		return nil, err
	}

	if err := i.service.LeaveEvent(ctx, eventID, user.ID); err != nil {
		return nil, errors.BadRequest("LEAVE_EVENT_FAILED", err.Error())
	}
	return &v1.EventStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
