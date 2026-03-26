package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) JoinRoomToken(ctx context.Context, req *v1.JoinRoomTokenRequest) (*v1.JoinRoomTokenResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}
	room, credentials, err := i.service.JoinRoomToken(ctx, roomID, user)
	if err != nil {
		return nil, err
	}
	return &v1.JoinRoomTokenResponse{
		AccessToken: credentials.AccessToken,
		Provider:    credentials.Provider,
		ServerUrl:   credentials.ServerURL,
		Room:        mapRoom(room),
	}, nil
}
