package room

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type Service interface {
	ListRooms(context.Context, *model.User, model.ListRoomsOptions) (*model.ListRoomsResponse, error)
	GetRoom(context.Context, uuid.UUID, *model.User) (*model.Room, error)
	CreateRoom(context.Context, *model.User, model.CreateRoomRequest) (*model.Room, error)
	UpdateRoom(context.Context, uuid.UUID, *model.User, model.UpdateRoomRequest) (*model.Room, error)
	DeleteRoom(context.Context, uuid.UUID, *model.User) error
	JoinRoomToken(context.Context, uuid.UUID, *model.User) (*model.Room, *model.RoomJoinCredentials, error)
	GetRoomMediaState(context.Context, uuid.UUID, *model.User) (*model.RoomMediaState, error)
	UpsertRoomMediaState(context.Context, uuid.UUID, *model.User, model.UpsertRoomMediaStateRequest) (*model.RoomMediaState, error)
}

// Implementation of room service.
type Implementation struct {
	v1.UnimplementedRoomServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.RoomService_ServiceDesc
}
