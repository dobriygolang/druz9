package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"

	goerrors "errors"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) StartRoom(ctx context.Context, req *v1.StartRoomRequest) (*v1.StartRoomResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_ROOM_ID", "invalid room_id")
	}

	callerID, _, _ := resolveActor(ctx, "")

	room, err := i.service.StartRoom(ctx, roomID, callerID)
	if err != nil {
		switch {
		case goerrors.Is(err, codeeditordomain.ErrForbidden):
			return nil, kratosErrors.Forbidden("FORBIDDEN", "only the room creator can start the room")
		case goerrors.Is(err, codeeditordomain.ErrRoomNotFound):
			return nil, kratosErrors.NotFound("ROOM_NOT_FOUND", "room not found")
		}
		return nil, kratosErrors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	return &v1.StartRoomResponse{
		Status:     commonv1.OperationStatus_OPERATION_STATUS_OK,
		RoomStatus: roomStatusToProto(room.Status),
	}, nil
}
