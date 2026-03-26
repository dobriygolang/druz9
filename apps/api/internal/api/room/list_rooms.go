package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"
)

func (i *Implementation) ListRooms(ctx context.Context, req *v1.ListRoomsRequest) (*v1.ListRoomsResponse, error) {
	user, _ := model.UserFromContext(ctx)

	opts := model.ListRoomsOptions{
		Limit:  req.Limit,
		Offset: req.Offset,
		Kind:   req.Kind,
	}

	resp, err := i.service.ListRooms(ctx, user, opts)
	if err != nil {
		return nil, err
	}

	rooms := make([]*v1.Room, 0, len(resp.Rooms))
	for _, item := range resp.Rooms {
		rooms = append(rooms, mapRoom(item))
	}

	return &v1.ListRoomsResponse{
		Rooms:       rooms,
		Limit:       resp.Limit,
		Offset:      resp.Offset,
		TotalCount:  resp.TotalCount,
		HasNextPage: resp.HasNextPage,
	}, nil
}