package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/dto"
	v1 "api/pkg/api/code_editor/v1"
	"time"

	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapRoom(room *codeeditordomain.Room) *v1.Room {
	if room == nil {
		return nil
	}

	participants := make([]*v1.Participant, 0, len(room.Participants))
	for _, p := range room.Participants {
		if p == nil {
			continue
		}
		participants = append(participants, &v1.Participant{
			UserId:   userIDToString(p.UserID),
			Name:     p.Name,
			IsGuest:  p.IsGuest,
			IsReady:  p.IsReady,
			IsWinner: p.IsWinner,
			JoinedAt: timestamppb.New(p.JoinedAt),
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
	}
}

func mapRealtimeRoom(room *codeeditordomain.Room) *dto.CodeEditorRealtimeRoom {
	if room == nil {
		return nil
	}

	participants := make([]*dto.CodeEditorRealtimeParticipant, 0, len(room.Participants))
	for _, participant := range room.Participants {
		if participant == nil {
			continue
		}

		participants = append(participants, &dto.CodeEditorRealtimeParticipant{
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

	return &dto.CodeEditorRealtimeRoom{
		ID:              room.ID.String(),
		Mode:            room.Mode,
		InviteCode:      room.InviteCode,
		CreatorID:       room.CreatorID.String(),
		Code:            room.Code,
		CodeRevision:    room.CodeRevision,
		Status:          room.Status,
		TaskID:          userIDToString(room.TaskID),
		MaxParticipants: maxParticipants,
		Participants:    participants,
		CreatedAt:       room.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       room.UpdatedAt.Format(time.RFC3339),
	}
}

func mapSubmissions(submissions []*codeeditordomain.Submission) []*v1.Submission {
	result := make([]*v1.Submission, 0, len(submissions))
	for _, s := range submissions {
		if s == nil {
			continue
		}
		result = append(result, &v1.Submission{
			Id:          s.ID.String(),
			UserId:      userIDToString(s.UserID),
			GuestName:   s.GuestName,
			Code:        s.Code,
			Output:      s.Output,
			Error:       s.Error,
			SubmittedAt: timestamppb.New(s.SubmittedAt),
			DurationMs:  s.DurationMs,
			IsCorrect:   s.IsCorrect,
			PassedCount: s.PassedCount,
			TotalCount:  s.TotalCount,
		})
	}
	return result
}

func mapTask(task *codeeditordomain.Task) *v1.Task {
	if task == nil {
		return nil
	}

	return &v1.Task{
		Id:               task.ID.String(),
		Title:            task.Title,
		Slug:             task.Slug,
		Statement:        task.Statement,
		Difficulty:       task.Difficulty,
		Topics:           task.Topics,
		StarterCode:      task.StarterCode,
		Language:         task.Language,
		TaskType:         task.TaskType,
		ExecutionProfile: task.ExecutionProfile,
		FixtureFiles:     task.FixtureFiles,
		ReadablePaths:    task.ReadablePaths,
		WritablePaths:    task.WritablePaths,
		AllowedHosts:     task.AllowedHosts,
		AllowedPorts:     task.AllowedPorts,
		MockEndpoints:    task.MockEndpoints,
		WritableTempDir:  task.WritableTempDir,
		IsActive:         task.IsActive,
		PublicTestCases:  mapTaskCases(task.PublicTestCases),
		HiddenTestCases:  mapTaskCases(task.HiddenTestCases),
		CreatedAt:        timestamppb.New(task.CreatedAt),
		UpdatedAt:        timestamppb.New(task.UpdatedAt),
	}
}

func mapTaskCases(cases []*codeeditordomain.TestCase) []*v1.TaskTestCase {
	result := make([]*v1.TaskTestCase, 0, len(cases))
	for _, tc := range cases {
		if tc == nil {
			continue
		}
		result = append(result, &v1.TaskTestCase{
			Id:             tc.ID.String(),
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			IsPublic:       tc.IsPublic,
			Weight:         tc.Weight,
			Order:          tc.Order,
		})
	}
	return result
}

func mapLeaderboard(entries []*codeeditordomain.LeaderboardEntry) []*v1.LeaderboardEntry {
	result := make([]*v1.LeaderboardEntry, 0, len(entries))
	for _, entry := range entries {
		if entry == nil {
			continue
		}
		result = append(result, &v1.LeaderboardEntry{
			UserId:      entry.UserID,
			DisplayName: entry.DisplayName,
			Wins:        entry.Wins,
			Matches:     entry.Matches,
			WinRate:     entry.WinRate,
			BestSolveMs: entry.BestSolveMs,
		})
	}
	return result
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

func roomTitle(room *codeeditordomain.Room) string {
	if room == nil {
		return ""
	}
	return "Комната " + room.ID.String()[:8]
}

func roomModeToProto(mode string) v1.RoomMode {
	switch mode {
	case codeeditordomain.RoomModeAll:
		return v1.RoomMode_ROOM_MODE_ALL
	case codeeditordomain.RoomModeDuel:
		return v1.RoomMode_ROOM_MODE_DUEL
	default:
		return v1.RoomMode_ROOM_MODE_UNSPECIFIED
	}
}

func roomStatusToProto(status string) v1.RoomStatus {
	switch status {
	case codeeditordomain.RoomStatusWaiting:
		return v1.RoomStatus_ROOM_STATUS_WAITING
	case codeeditordomain.RoomStatusActive:
		return v1.RoomStatus_ROOM_STATUS_ACTIVE
	case codeeditordomain.RoomStatusFinished:
		return v1.RoomStatus_ROOM_STATUS_FINISHED
	default:
		return v1.RoomStatus_ROOM_STATUS_UNSPECIFIED
	}
}
