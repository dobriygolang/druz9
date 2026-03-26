package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetRoomMediaState(ctx context.Context, req *v1.GetRoomMediaStateRequest) (*v1.RoomMediaStateResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}
	user, _ := model.UserFromContext(ctx)
	item, err := i.service.GetRoomMediaState(ctx, roomID, user)
	if err != nil {
		return nil, err
	}
	return &v1.RoomMediaStateResponse{MediaState: mapRoomMediaState(item)}, nil
}

func (i *Implementation) UpsertRoomMediaState(ctx context.Context, req *v1.UpsertRoomMediaStateRequest) (*v1.RoomMediaStateResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}
	item, err := i.service.UpsertRoomMediaState(ctx, roomID, user, model.UpsertRoomMediaStateRequest{
		MediaURL:           req.MediaUrl,
		Paused:             req.Paused,
		CurrentTimeSeconds: req.CurrentTimeSeconds,
	})
	if err != nil {
		return nil, err
	}
	return &v1.RoomMediaStateResponse{MediaState: mapRoomMediaState(item)}, nil
}
