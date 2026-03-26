package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) UpdateRoom(ctx context.Context, req *v1.UpdateRoomRequest) (*v1.RoomResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}
	item, err := i.service.UpdateRoom(ctx, roomID, user, model.UpdateRoomRequest{
		Title:       req.Title,
		Description: req.Description,
		IsPrivate:   req.IsPrivate,
		MediaURL:    req.MediaUrl,
	})
	if err != nil {
		return nil, err
	}
	return &v1.RoomResponse{Room: mapRoom(item)}, nil
}
