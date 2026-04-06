package code_editor

import (
	"time"

	codeeditordomain "api/internal/domain/codeeditor"
	realtime "api/internal/realtime/schema"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapRoom(room *codeeditordomain.Room) *v1.Room {
	if room == nil {
		return nil
	}

	participants := make([]*v1.Participant, 0, len(room.Participants))
	for _, participant := range room.Participants {
		if participant == nil {
			continue
		}
		participants = append(participants, &v1.Participant{
			UserId:    userIDToString(participant.UserID),
			Name:      participant.Name,
			IsGuest:   participant.IsGuest,
			IsReady:   participant.IsReady,
			IsWinner:  participant.IsWinner,
			JoinedAt:  timestamppb.New(participant.JoinedAt),
			IsCreator: participant.UserID != nil && *participant.UserID == room.CreatorID,
		})
	}

	return &v1.Room{
		Id:           room.ID.String(),
		Mode:         roomModeToProto(room.Mode),
		Code:         room.Code,
		Status:       roomStatusToProto(room.Status),
		InviteCode:   room.InviteCode,
		Task:         room.Task,
		CreatedAt:    timestamppb.New(room.CreatedAt),
		Participants: participants,
		TaskId:       userIDToString(room.TaskID),
		CodeRevision: room.CodeRevision,
		CreatorId:    room.CreatorID.String(),
		IsPrivate:    room.IsPrivate,
	}
}

func mapRealtimeRoom(room *codeeditordomain.Room) *realtime.CodeEditorRoom {
	if room == nil {
		return nil
	}

	participants := make([]*realtime.CodeEditorParticipant, 0, len(room.Participants))
	for _, participant := range room.Participants {
		if participant == nil {
			continue
		}
		participants = append(participants, &realtime.CodeEditorParticipant{
			ID:          participantIdentity(participant),
			UserID:      userIDToString(participant.UserID),
			DisplayName: participant.Name,
			IsGuest:     participant.IsGuest,
			IsReady:     participant.IsReady,
			JoinedAt:    participant.JoinedAt.Format(time.RFC3339),
		})
	}

	maxParticipants := int32(10)
	if room.Mode == codeeditordomain.RoomModeDuel {
		maxParticipants = 2
	}

	return &realtime.CodeEditorRoom{
		ID:              room.ID.String(),
		Mode:            room.Mode.String(),
		InviteCode:      room.InviteCode,
		CreatorID:       room.CreatorID.String(),
		Code:            room.Code,
		CodeRevision:    room.CodeRevision,
		Status:          room.Status.String(),
		TaskID:          userIDToString(room.TaskID),
		MaxParticipants: maxParticipants,
		Participants:    participants,
		CreatedAt:       room.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       room.UpdatedAt.Format(time.RFC3339),
	}
}

func userIDToString(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}

func participantIdentity(participant *codeeditordomain.Participant) string {
	if participant == nil {
		return ""
	}
	if participant.UserID != nil {
		return participant.UserID.String()
	}
	return participant.Name
}
