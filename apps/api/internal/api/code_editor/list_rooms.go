package code_editor

import (
	"context"
	"time"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
)

func (i *Implementation) ListRooms(ctx context.Context, req *v1.ListRoomsRequest) (*v1.ListRoomsResponse, error) {
	userID, _, _ := resolveActor(ctx, "")
	rooms, err := i.service.ListRooms(ctx, userID)
	if err != nil {
		return nil, mapErr(err)
	}

	items := make([]*v1.ListRoomsRoomItem, 0, len(rooms))
	for _, room := range rooms {
		participants := make([]*v1.ListRoomsParticipant, 0, len(room.Participants))
		for _, p := range room.Participants {
			if p == nil {
				continue
			}
			isCreator := p.UserID != nil && *p.UserID == room.CreatorID
			participants = append(participants, &v1.ListRoomsParticipant{
				UserID:    userIDToString(p.UserID),
				Name:      p.Name,
				IsGuest:   p.IsGuest,
				IsReady:   p.IsReady,
				IsWinner:  p.IsWinner,
				JoinedAt:  p.JoinedAt.Format(time.RFC3339),
				IsCreator: isCreator,
			})
		}
		items = append(items, &v1.ListRoomsRoomItem{
			ID:           room.ID.String(),
			Mode:         roomModeToProto(room.Mode).String(),
			Status:       roomStatusToProto(room.Status).String(),
			InviteCode:   room.InviteCode,
			Task:         room.Task,
			CreatedAt:    room.CreatedAt.Format(time.RFC3339),
			Participants: participants,
			TaskID:       userIDToString(room.TaskID),
			CodeRevision: room.CodeRevision,
			CreatorID:    room.CreatorID.String(),
		})
	}

	return &v1.ListRoomsResponse{Rooms: items}, nil
}

// Ensure *uuid.UUID nil-safety helper is available here (defined in mapping_room.go).
var _ = userIDToString((*uuid.UUID)(nil))
