package codeeditor

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/google/uuid"

	"api/internal/app/taskjudge"
	domain "api/internal/domain/codeeditor"
	"api/internal/model"
)

var errPortOutOfRange = errors.New("port out of int32 range")

func (s *Service) submitDuelCode(ctx context.Context, room *domain.Room, userID *uuid.UUID, guestName, code string, language model.ProgrammingLanguage) (*domain.Submission, error) {
	task, err := s.getCachedTask(ctx, *room.TaskID)
	if err != nil {
		return nil, fmt.Errorf("get cached task: %w", err)
	}

	judgeResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, task, code, normalizeRoomLanguage(language).String())
	if err != nil {
		return nil, fmt.Errorf("evaluate code task: %w", err)
	}

	submission := &domain.Submission{
		ID:          uuid.New(),
		RoomID:      room.ID,
		UserID:      userID,
		GuestName:   guestName,
		Code:        code,
		Output:      judgeResult.LastOutput,
		Error:       judgeResult.LastError,
		SubmittedAt: now(),
		IsCorrect:   judgeResult.Passed,
		PassedCount: judgeResult.PassedCount,
		TotalCount:  judgeResult.TotalCount,
	}

	if room.StartedAt != nil {
		submission.DurationMs = submission.SubmittedAt.Sub(*room.StartedAt).Milliseconds()
	}

	created, err := s.repo.CreateSubmission(ctx, submission)
	if err != nil {
		return nil, fmt.Errorf("create submission: %w", err)
	}

	if created.IsCorrect && room.Status == domain.RoomStatusActive {
		finishedAt := now()
		if err := s.repo.SetWinner(ctx, room.ID, userID, guestName); err != nil {
			return nil, fmt.Errorf("set winner: %w", err)
		}
		if err := s.repo.FinishDuel(ctx, room.ID, userID, guestName, finishedAt); err != nil {
			return nil, fmt.Errorf("finish duel: %w", err)
		}
	}

	return created, nil
}

func safePortInt32(value int) (int32, error) {
	if value < 0 || value > math.MaxInt32 {
		return 0, fmt.Errorf("%w: %d", errPortOutOfRange, value)
	}
	return int32(value), nil
}
