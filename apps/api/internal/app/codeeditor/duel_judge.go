package codeeditor

import (
	"context"
	"fmt"
	"math"

	"api/internal/app/taskjudge"
	domain "api/internal/domain/codeeditor"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
)

func (s *Service) submitDuelCode(ctx context.Context, room *domain.Room, userID *uuid.UUID, guestName string, code string) (*domain.Submission, error) {
	taskIDStr := room.TaskID.String()
	taskPtr, ok := s.taskCache.Get(taskIDStr)
	if !ok {
		task, err := s.repo.GetTask(ctx, *room.TaskID)
		if err != nil {
			return nil, err
		}
		s.taskCache.Set(taskIDStr, *task, 0)
		taskPtr = *task
	}

	task := &taskPtr

	judgeResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, task, code)
	if err != nil {
		return nil, err
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
		return nil, err
	}

	if created.IsCorrect && room.Status == domain.RoomStatusActive {
		finishedAt := now()
		// FinishDuel first: atomically transitions the room to Finished and records the
		// winner in code_rooms (authoritative). Must succeed before anything else.
		if err := s.repo.FinishDuel(ctx, room.ID, userID, guestName, finishedAt); err != nil {
			return nil, err
		}
		// SetWinner updates the denormalized is_winner flag on code_participants.
		// Best-effort: room is already correctly finished above, so a failure here
		// is non-fatal — the flag may be stale until the next cleanup pass.
		if err := s.repo.SetWinner(ctx, room.ID, userID, guestName); err != nil {
			klog.Errorf("duel: set winner participant flag room=%s: %v", room.ID, err)
		}
	}

	return created, nil
}

func safeInt32(value int) int32 {
	switch {
	case value > math.MaxInt32:
		return math.MaxInt32
	case value < math.MinInt32:
		return math.MinInt32
	default:
		return int32(value)
	}
}

func safePortInt32(value int) (int32, error) {
	if value < 0 || value > math.MaxInt32 {
		return 0, fmt.Errorf("port %d is out of int32 range", value)
	}
	return int32(value), nil
}
