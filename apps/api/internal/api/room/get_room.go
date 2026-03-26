package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetRoom(ctx context.Context, req *v1.GetRoomRequest) (*v1.RoomResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}
	user, _ := model.UserFromContext(ctx)
	item, err := i.service.GetRoom(ctx, roomID, user)
	if err != nil {
		return nil, err
	}
	return &v1.RoomResponse{Room: mapRoom(item)}, nil
}
