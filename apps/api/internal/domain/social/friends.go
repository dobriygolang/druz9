package social

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
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
