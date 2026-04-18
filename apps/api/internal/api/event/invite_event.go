package event

import (
	"context"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) InviteToEvent(ctx context.Context, req *v1.InviteToEventRequest) (*v1.EventStatusResponse, error) {
	eventID, err := apihelpers.ParseUUID(req.GetEventId(), "INVALID_EVENT_ID", "event_id")
	if err != nil {
		return nil, err
	}
	inviteeID, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, err
	}
	if _, err := i.service.JoinEvent(ctx, eventID, inviteeID); err != nil {
		return nil, err
	}
	return &v1.EventStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_INVITED}, nil
}
