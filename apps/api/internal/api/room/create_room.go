package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateRoom(ctx context.Context, req *v1.CreateRoomRequest) (*v1.RoomResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	item, err := i.service.CreateRoom(ctx, user, model.CreateRoomRequest{
		Title:       req.Title,
		Kind:        req.Kind,
		Description: req.Description,
		IsPrivate:   req.IsPrivate,
		MediaURL:    req.MediaUrl,
	})
	if err != nil {
		return nil, err
	}
	return &v1.RoomResponse{Room: mapRoom(item)}, nil
}
