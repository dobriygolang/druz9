package service

import (
	"context"

	"api/internal/model"
)

// IssueRoomToken issues a token for joining a room.
func (s *Service) IssueRoomToken(ctx context.Context, room *model.Room, user *model.User) (*model.RoomJoinCredentials, error) {
	return s.tokenIssuer.IssueRoomToken(ctx, room, user)
}
