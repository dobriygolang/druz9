package event

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) DeleteEvent(ctx context.Context, req *v1.DeleteEventRequest) (*v1.EventStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	eventID, err := apihelpers.ParseUUID(req.GetEventId(), "INVALID_EVENT_ID", "event_id")
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	ctx = model.ContextWithEventDeleteScope(ctx, unmapDeleteEventScope(req.GetDeleteScope()))
	if err := i.service.DeleteEvent(ctx, eventID, user); err != nil {
		return nil, fmt.Errorf("delete event: %w", err)
	}
	return &v1.EventStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
