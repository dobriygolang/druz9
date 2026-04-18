package social

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Service is the interface consumed by transport handlers.
type Service interface {
	ListFriends(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.FriendList, error)
	ListPendingRequests(ctx context.Context, userID uuid.UUID) (*model.FriendRequestBuckets, error)
	SendFriendRequest(ctx context.Context, fromID uuid.UUID, toUsername, message string) (*model.FriendRequest, error)
	AcceptFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) (*model.Friend, error)
	DeclineFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) error
	RemoveFriend(ctx context.Context, viewerID, otherID uuid.UUID) error
	SearchUsers(ctx context.Context, viewerID uuid.UUID, query string, limit int32) ([]*model.UserHit, error)
}
