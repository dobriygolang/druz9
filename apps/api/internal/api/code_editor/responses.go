package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	realtime "api/internal/realtime/schema"
	v1 "api/pkg/api/code_editor/v1"
	"time"

	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func modelDifficultyToProto(difficulty model.TaskDifficulty) v1.TaskDifficulty {
	switch difficulty {
	case model.TaskDifficultyEasy:
		return v1.TaskDifficulty_TASK_DIFFICULTY_EASY
	case model.TaskDifficultyMedium:
		return v1.TaskDifficulty_TASK_DIFFICULTY_MEDIUM
	case model.TaskDifficultyHard:
		return v1.TaskDifficulty_TASK_DIFFICULTY_HARD
	default:
		return v1.TaskDifficulty_TASK_DIFFICULTY_UNSPECIFIED
	}
}

func modelLanguageToProto(language model.ProgrammingLanguage) v1.ProgrammingLanguage {
	switch language {
	case model.ProgrammingLanguageJavaScript:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT
	case model.ProgrammingLanguageTypeScript:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT
	case model.ProgrammingLanguagePython:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON
	case model.ProgrammingLanguageGo:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO
	case model.ProgrammingLanguageRust:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST
	case model.ProgrammingLanguageCpp:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP
	case model.ProgrammingLanguageJava:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA
	default:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_UNSPECIFIED
	}
}

func modelTaskTypeToProto(taskType model.TaskType) v1.TaskType {
	switch taskType {
	case model.TaskTypeAlgorithm:
		return v1.TaskType_TASK_TYPE_ALGORITHM
	case model.TaskTypeDebugging:
		return v1.TaskType_TASK_TYPE_DEBUGGING
	case model.TaskTypeRefactoring:
		return v1.TaskType_TASK_TYPE_REFACTORING
	default:
		return v1.TaskType_TASK_TYPE_UNSPECIFIED
	}
}

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
		Difficulty:       modelDifficultyToProto(task.Difficulty),
		Topics:           task.Topics,
		StarterCode:      task.StarterCode,
		Language:         modelLanguageToProto(task.Language),
		TaskType:         modelTaskTypeToProto(task.TaskType),
		ExecutionProfile: task.ExecutionProfile.String(),
		RunnerMode:       task.RunnerMode.String(),
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

func roomModeToProto(mode model.RoomMode) v1.RoomMode {
	switch mode {
	case model.RoomModeAll:
		return v1.RoomMode_ROOM_MODE_ALL
	case model.RoomModeDuel:
		return v1.RoomMode_ROOM_MODE_DUEL
	default:
		return v1.RoomMode_ROOM_MODE_UNSPECIFIED
	}
}

func roomStatusToProto(status model.RoomStatus) v1.RoomStatus {
	switch status {
	case model.RoomStatusWaiting:
		return v1.RoomStatus_ROOM_STATUS_WAITING
	case model.RoomStatusActive:
		return v1.RoomStatus_ROOM_STATUS_ACTIVE
	case model.RoomStatusFinished:
		return v1.RoomStatus_ROOM_STATUS_FINISHED
	default:
		return v1.RoomStatus_ROOM_STATUS_UNSPECIFIED
	}
}
