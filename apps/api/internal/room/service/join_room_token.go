package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// JoinRoomToken ensures user is a member of the room and returns join credentials.
func (s *Service) JoinRoomToken(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.Room, *model.RoomJoinCredentials, error) {
	room, err := s.EnsureRoomMembership(ctx, roomID, user)
	if err != nil {
		return nil, nil, err
	}

	creds, err := s.IssueRoomToken(ctx, room, user)
	if err != nil {
		return nil, nil, err
	}

	return room, creds, nil
}
