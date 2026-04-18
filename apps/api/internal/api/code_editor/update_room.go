package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) UpdateRoom(ctx context.Context, req *v1.UpdateRoomRequest) (*v1.StatusResponse, error) {
	roomID, err := uuid.Parse(req.GetRoomId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	callerID, _, _ := resolveActor(ctx, "")

	if task := req.GetTask(); task != "" {
		if err := i.service.SetRoomTask(ctx, roomID, callerID, task); err != nil {
			return nil, errors.Forbidden("FORBIDDEN", err.Error())
		}
	}

	if req.IsPrivate != nil {
		if err := i.service.SetRoomPrivacy(ctx, roomID, callerID, req.GetIsPrivate()); err != nil {
			return nil, errors.Forbidden("FORBIDDEN", err.Error())
		}
	}

	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
