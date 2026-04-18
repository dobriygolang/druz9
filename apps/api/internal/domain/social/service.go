// Package social is the friends-graph domain: sending/accepting/removing
// friendships. Chat between friends is the inbox service's concern; this
// package only owns the relationship edges.
package social

import (
	"context"
	"errors"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
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

var (
	ErrUserNotFound      = errors.New("social: user not found")
	ErrCannotFriendSelf  = errors.New("social: cannot friend yourself")
	ErrAlreadyFriends    = errors.New("social: already friends")
	ErrRequestPending    = errors.New("social: a friend request is already pending")
	ErrRequestNotFound   = errors.New("social: friend request not found")
	ErrNotRecipient      = errors.New("social: only the recipient can accept/decline")
	ErrAlreadyResolved   = errors.New("social: request has already been resolved")
	ErrMessageTooLong    = errors.New("social: message exceeds 280 chars")
	ErrNotFriends        = errors.New("social: not friends")
)

// ListFriends paginates the viewer's friends.
func (s *Service) ListFriends(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.FriendList, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	friends, total, online, err := s.repo.ListFriends(ctx, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	if friends == nil {
		friends = []*model.Friend{}
	}
	return &model.FriendList{Friends: friends, Total: total, OnlineCount: online}, nil
}

// ListPendingRequests returns incoming + outgoing buckets.
func (s *Service) ListPendingRequests(ctx context.Context, userID uuid.UUID) (*model.FriendRequestBuckets, error) {
	bkt, err := s.repo.GetPendingRequestsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if bkt.Incoming == nil {
		bkt.Incoming = []*model.FriendRequest{}
	}
	if bkt.Outgoing == nil {
		bkt.Outgoing = []*model.FriendRequest{}
	}
	return bkt, nil
}

// SendFriendRequest resolves the recipient by username, validates, records.
func (s *Service) SendFriendRequest(ctx context.Context, fromID uuid.UUID, toUsername, message string) (*model.FriendRequest, error) {
	message = strings.TrimSpace(message)
	if len(message) > maxMessageLen {
		return nil, ErrMessageTooLong
	}

	toID, _, err := s.users.FindUserIDByUsername(ctx, toUsername)
	if err != nil {
		return nil, ErrUserNotFound
	}
	if toID == fromID {
		return nil, ErrCannotFriendSelf
	}

	already, err := s.repo.AreFriends(ctx, fromID, toID)
	if err != nil {
		return nil, err
	}
	if already {
		return nil, ErrAlreadyFriends
	}

	// Repository's unique-partial index on pending requests returns a
	// duplicate-key error; the data layer maps it to ErrRequestPending.
	req := &model.FriendRequest{
		ID:         uuid.New(),
		FromUserID: fromID,
		ToUserID:   toID,
		Message:    message,
		Status:     model.FriendRequestStatusPending,
		CreatedAt:  time.Now().UTC(),
	}
	if err := s.repo.InsertRequest(ctx, req); err != nil {
		return nil, err
	}
	return req, nil
}

// AcceptFriendRequest flips the request to ACCEPTED and creates the
// friendship row in a transaction.
func (s *Service) AcceptFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) (*model.Friend, error) {
	req, err := s.repo.GetRequestByID(ctx, requestID)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, ErrRequestNotFound
	}
	if req.ToUserID != viewerID {
		return nil, ErrNotRecipient
	}
	if req.Status != model.FriendRequestStatusPending {
		return nil, ErrAlreadyResolved
	}

	now := time.Now().UTC()
	if _, err := s.repo.InsertFriendship(ctx, req.FromUserID, req.ToUserID); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateRequestStatus(ctx, req.ID, model.FriendRequestStatusAccepted, now); err != nil {
		return nil, err
	}
	return s.repo.GetFriendByID(ctx, viewerID, req.FromUserID)
}

// DeclineFriendRequest flips to DECLINED without creating a friendship.
func (s *Service) DeclineFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) error {
	req, err := s.repo.GetRequestByID(ctx, requestID)
	if err != nil {
		return err
	}
	if req == nil {
		return ErrRequestNotFound
	}
	if req.ToUserID != viewerID {
		return ErrNotRecipient
	}
	if req.Status != model.FriendRequestStatusPending {
		return ErrAlreadyResolved
	}
	return s.repo.UpdateRequestStatus(ctx, req.ID, model.FriendRequestStatusDeclined, time.Now().UTC())
}

// RemoveFriend drops the friendship row. Either party may call it.
func (s *Service) RemoveFriend(ctx context.Context, viewerID, otherID uuid.UUID) error {
	already, err := s.repo.AreFriends(ctx, viewerID, otherID)
	if err != nil {
		return err
	}
	if !already {
		return ErrNotFriends
	}
	return s.repo.RemoveFriendship(ctx, viewerID, otherID)
}
