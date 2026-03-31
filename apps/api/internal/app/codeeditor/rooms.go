package codeeditor

import (
	"context"
	"strings"
	"time"

	domain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/policy"
	"api/internal/sandbox"

	"github.com/google/uuid"
)

func (s *Service) CreateRoom(ctx context.Context, creatorID *uuid.UUID, name string, isGuest bool, mode string, topic string, difficulty string) (*domain.Room, error) {
	modeEnum := model.RoomModeFromString(mode)
	if modeEnum != model.RoomModeAll && modeEnum != model.RoomModeDuel {
		return nil, domain.ErrInvalidMode
	}

	inviteCode := generateInviteCode()
	taskDescription := ""
	code := defaultCode()
	var taskID *uuid.UUID
	nowTime := now()

	if modeEnum == model.RoomModeDuel {
		task, err := s.repo.PickRandomTask(ctx, topic, difficulty)
		if err != nil {
			return nil, err
		}
		if task == nil {
			return nil, domain.ErrNoAvailableTasks
		}
		taskID = &task.ID
		taskDescription = task.Statement
		code = task.StarterCode
		s.taskCache.Set(task.ID.String(), *task, 0)
	}

	room := &domain.Room{
		ID:         uuid.New(),
		Mode:       modeEnum,
		Code:       code,
		Status:     model.RoomStatusWaiting,
		CreatorID:  uuid.Nil,
		InviteCode: inviteCode,
		Task:       taskDescription,
		TaskID:     taskID,
		DuelTopic:  topic,
		CreatedAt:  nowTime,
		UpdatedAt:  nowTime,
	}

	if creatorID != nil {
		room.CreatorID = *creatorID
	}

	participant := &domain.Participant{
		UserID:   creatorID,
		Name:     name,
		IsGuest:  isGuest,
		IsReady:  false,
		IsWinner: false,
		JoinedAt: nowTime,
	}
	room.Participants = []*domain.Participant{participant}

	return s.repo.CreateRoom(ctx, room)
}

func (s *Service) GetRoom(ctx context.Context, roomID uuid.UUID) (*domain.Room, error) {
	return s.repo.GetRoom(ctx, roomID)
}

func (s *Service) JoinRoom(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, name string, isGuest bool) (*domain.Room, error) {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}

	for _, participant := range room.Participants {
		if userID != nil && participant.UserID != nil && *participant.UserID == *userID {
			return room, nil
		}
		if userID == nil && participant.IsGuest && strings.EqualFold(strings.TrimSpace(participant.Name), strings.TrimSpace(name)) {
			return room, nil
		}
	}

	if room.Mode == domain.RoomModeDuel && len(room.Participants) >= 2 {
		return nil, domain.ErrRoomFull
	}

	participant := &domain.Participant{
		UserID:   userID,
		Name:     name,
		IsGuest:  isGuest,
		IsReady:  false,
		IsWinner: false,
		JoinedAt: now(),
	}

	updatedRoom, err := s.repo.AddParticipant(ctx, roomID, participant)
	if err != nil {
		return nil, err
	}

	if updatedRoom.Mode == model.RoomModeDuel && len(updatedRoom.Participants) == 2 && updatedRoom.Status == model.RoomStatusWaiting {
		startedAt := now()
		if err := s.repo.StartDuel(ctx, roomID, startedAt); err != nil {
			return nil, err
		}
		updatedRoom.Status = model.RoomStatusActive
		updatedRoom.StartedAt = &startedAt
		return updatedRoom, nil
	}

	return updatedRoom, nil
}

func (s *Service) JoinRoomByInviteCode(ctx context.Context, inviteCode string, userID *uuid.UUID, name string, isGuest bool) (*domain.Room, error) {
	room, err := s.repo.GetRoomByInviteCode(ctx, inviteCode)
	if err != nil {
		return nil, domain.ErrRoomNotFound
	}
	return s.JoinRoom(ctx, room.ID, userID, name, isGuest)
}

func (s *Service) LeaveRoom(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error {
	return s.repo.RemoveParticipant(ctx, roomID, userID, guestName)
}

func (s *Service) SubmitCode(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, code string) (*domain.Submission, error) {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}

	if room.Mode == model.RoomModeDuel && room.Status == model.RoomStatusFinished {
		return nil, domain.ErrRoomAlreadyClosed
	}

	if room.Mode == domain.RoomModeDuel && room.TaskID != nil {
		return s.submitDuelCode(ctx, room, userID, guestName, code)
	}

	result, err := s.sandbox.Execute(ctx, sandbox.ExecutionRequest{
		Code:       code,
		Task:       policy.TaskSpecForCodeEditorRun(),
		Language:   policy.LanguageGo,
		RunnerMode: model.RunnerModeProgram.String(),
	})
	if err != nil {
		submission := &domain.Submission{
			ID:          uuid.New(),
			RoomID:      roomID,
			UserID:      userID,
			GuestName:   guestName,
			Code:        code,
			Output:      "",
			Error:       err.Error(),
			SubmittedAt: now(),
			IsCorrect:   false,
		}
		return s.repo.CreateSubmission(ctx, submission)
	}

	submission := &domain.Submission{
		ID:          uuid.New(),
		RoomID:      roomID,
		UserID:      userID,
		GuestName:   guestName,
		Code:        code,
		Output:      result.Output,
		SubmittedAt: now(),
		IsCorrect:   true,
	}

	if room.Mode == domain.RoomModeDuel && len(room.Participants) == 2 {
		allReady := true
		for _, p := range room.Participants {
			if !p.IsReady {
				allReady = false
				break
			}
		}
		if allReady && room.Status == model.RoomStatusWaiting {
			_ = s.repo.UpdateRoomStatus(ctx, roomID, model.RoomStatusActive)
		}
	}

	return s.repo.CreateSubmission(ctx, submission)
}

func (s *Service) SetReady(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, ready bool) error {
	return s.repo.SetParticipantReady(ctx, roomID, userID, guestName, ready)
}

func (s *Service) GetSubmissions(ctx context.Context, roomID uuid.UUID) ([]*domain.Submission, error) {
	return s.repo.GetSubmissions(ctx, roomID)
}

func (s *Service) CleanupInactiveRooms(ctx context.Context, idleFor time.Duration) (int64, error) {
	return s.repo.CleanupInactiveRooms(ctx, idleFor)
}
