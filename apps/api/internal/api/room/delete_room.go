package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeleteRoom(ctx context.Context, req *v1.DeleteRoomRequest) (*v1.RoomStatusResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}
	if err := i.service.DeleteRoom(ctx, roomID, user); err != nil {
		return nil, err
	}
	return &v1.RoomStatusResponse{Status: "ok"}, nil
}
