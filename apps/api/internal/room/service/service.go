package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents room domain service configuration.
type Config struct {
	Repository  Repository
	TokenIssuer TokenIssuer
}

// Service implements room domain logic.
type Service struct {
	repo        Repository
	tokenIssuer TokenIssuer
}

// Repository is a data-layer interface for room queries.
type Repository interface {
	ListRooms(ctx context.Context, user *model.User, opts model.ListRoomsOptions) (*model.ListRoomsResponse, error)
	GetRoom(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.Room, error)
	CreateRoom(ctx context.Context, user *model.User, req model.CreateRoomRequest) (*model.Room, error)
	UpdateRoom(ctx context.Context, roomID uuid.UUID, user *model.User, req model.UpdateRoomRequest) (*model.Room, error)
	DeleteRoom(ctx context.Context, roomID uuid.UUID, user *model.User) error
	EnsureRoomMembership(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.Room, error)
	GetRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.RoomMediaState, error)
	UpsertRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User, req model.UpsertRoomMediaStateRequest) (*model.RoomMediaState, error)
}

// TokenIssuer issues room join tokens.
type TokenIssuer interface {
	IssueRoomToken(ctx context.Context, room *model.Room, user *model.User) (*model.RoomJoinCredentials, error)
}

// NewRoomService creates new room domain service.
func NewRoomService(c Config) *Service {
	return &Service{
		repo:        c.Repository,
		tokenIssuer: c.TokenIssuer,
	}
}
