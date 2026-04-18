package code_editor

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"
)

func (i *Implementation) LeaveRoom(ctx context.Context, req *v1.LeaveRoomRequest) (*v1.StatusResponse, error) {
	roomID, err := uuid.Parse(req.GetRoomId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	userID, guestName, _ := resolveActor(ctx, "")
	if err := i.service.LeaveRoom(ctx, roomID, userID, guestName); err != nil {
		return nil, mapErr(err)
	}

	if room, getErr := i.service.GetRoom(ctx, roomID); getErr == nil {
		i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	}

	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
