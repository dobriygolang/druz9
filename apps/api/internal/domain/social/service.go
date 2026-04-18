// Package social is the friends-graph domain: sending/accepting/removing
// friendships. Chat between friends is the inbox service's concern; this
// package only owns the relationship edges.
package social

import (
	"context"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

const maxMessageLen = 280

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

type Repository interface {
	ListFriends(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.Friend, int32, int32, error)
	AreFriends(ctx context.Context, a, b uuid.UUID) (bool, error)
	RemoveFriendship(ctx context.Context, a, b uuid.UUID) error

	GetPendingRequestsByUser(ctx context.Context, userID uuid.UUID) (*model.FriendRequestBuckets, error)
	GetRequestByID(ctx context.Context, id uuid.UUID) (*model.FriendRequest, error)
	InsertRequest(ctx context.Context, req *model.FriendRequest) error
	UpdateRequestStatus(ctx context.Context, id uuid.UUID, status model.FriendRequestStatus, now time.Time) error
	InsertFriendship(ctx context.Context, a, b uuid.UUID) (time.Time, error)

	GetFriendByID(ctx context.Context, viewerID, friendID uuid.UUID) (*model.Friend, error)
	SearchUsers(ctx context.Context, viewerID uuid.UUID, query string, limit int32) ([]*model.UserHit, error)
}

//go:generate mockery --case underscore --name UserLookup --with-expecter --output mocks

type UserLookup interface {
	FindUserIDByUsername(ctx context.Context, username string) (uuid.UUID, string, error)
}

type Config struct {
	Repository Repository
	Users      UserLookup
}

type Service struct {
	repo  Repository
	users UserLookup
}

func NewService(c Config) *Service { return &Service{repo: c.Repository, users: c.Users} }
