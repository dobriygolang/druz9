package social

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
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
		return nil, fmt.Errorf("list friends: %w", err)
	}
	if friends == nil {
		friends = []*model.Friend{}
	}
	return &model.FriendList{Friends: friends, Total: total, OnlineCount: online}, nil
}

// RemoveFriend drops the friendship row. Either party may call it.
func (s *Service) RemoveFriend(ctx context.Context, viewerID, otherID uuid.UUID) error {
	already, err := s.repo.AreFriends(ctx, viewerID, otherID)
	if err != nil {
		return fmt.Errorf("check friends: %w", err)
	}
	if !already {
		return ErrNotFriends
	}
	if err := s.repo.RemoveFriendship(ctx, viewerID, otherID); err != nil {
		return fmt.Errorf("remove friendship: %w", err)
	}
	return nil
}
