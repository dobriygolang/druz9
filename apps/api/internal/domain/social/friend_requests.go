package social

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListPendingRequests returns incoming + outgoing buckets.
func (s *Service) ListPendingRequests(ctx context.Context, userID uuid.UUID) (*model.FriendRequestBuckets, error) {
	bkt, err := s.repo.GetPendingRequestsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get pending requests by user: %w", err)
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
		return nil, fmt.Errorf("are friends: %w", err)
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
		return nil, fmt.Errorf("insert request: %w", err)
	}
	return req, nil
}

// AcceptFriendRequest flips the request to ACCEPTED and creates the
// friendship row in a transaction.
func (s *Service) AcceptFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) (*model.Friend, error) {
	req, err := s.repo.GetRequestByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("get request by id: %w", err)
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
		return nil, fmt.Errorf("insert friendship: %w", err)
	}
	if err := s.repo.UpdateRequestStatus(ctx, req.ID, model.FriendRequestStatusAccepted, now); err != nil {
		return nil, fmt.Errorf("update request status: %w", err)
	}
	return s.repo.GetFriendByID(ctx, viewerID, req.FromUserID)
}

// DeclineFriendRequest flips to DECLINED without creating a friendship.
func (s *Service) DeclineFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) error {
	req, err := s.repo.GetRequestByID(ctx, requestID)
	if err != nil {
		return fmt.Errorf("get request by id: %w", err)
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
