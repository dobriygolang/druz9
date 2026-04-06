package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) ListRooms(ctx context.Context, req *v1.ListRoomsRequest) (*v1.ListRoomsResponse, error) {
	userID, _, _ := resolveActor(ctx, "")
	rooms, err := i.service.ListRooms(ctx, userID)
	if err != nil {
		return nil, mapErr(err)
	}

	items := make([]*v1.Room, 0, len(rooms))
	for _, room := range rooms {
		items = append(items, mapRoom(room))
	}

	return &v1.ListRoomsResponse{Rooms: items}, nil
}
