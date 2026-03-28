package codeeditor

import (
	"context"

	domain "api/internal/domain/codeeditor"
	"api/internal/policy"
	"api/internal/sandbox"

	"github.com/google/uuid"
)

func (s *Service) submitDuelCode(ctx context.Context, room *domain.Room, userID *uuid.UUID, guestName string, code string) (*domain.Submission, error) {
	task, err := s.repo.GetTask(ctx, *room.TaskID)
	if err != nil {
		return nil, err
	}

	testCases := append([]*domain.TestCase{}, task.PublicTestCases...)
	testCases = append(testCases, task.HiddenTestCases...)
	totalCount := len(testCases)
	passedCount := 0
	var lastOutput string
	var lastError string
	taskSpec := policy.TaskSpecFromCodeTask(task, policy.TaskTypeAlgorithmPractice)

	for _, tc := range testCases {
		result, runErr := s.sandbox.Execute(ctx, sandbox.ExecutionRequest{
			Code:       code,
			Input:      tc.Input,
			Task:       taskSpec,
			Language:   policy.LanguageGo,
			RunnerMode: task.RunnerMode.String(),
		})
		if runErr != nil {
			lastError = runErr.Error()
			break
		}
		lastOutput = result.Output
		if sandbox.NormalizeOutput(result.Output) == sandbox.NormalizeOutput(tc.ExpectedOutput) {
			passedCount++
			continue
		}
		lastError = "wrong answer"
	}

	submission := &domain.Submission{
		ID:          uuid.New(),
		RoomID:      room.ID,
		UserID:      userID,
		GuestName:   guestName,
		Code:        code,
		Output:      lastOutput,
		Error:       lastError,
		SubmittedAt: now(),
		IsCorrect:   totalCount > 0 && passedCount == totalCount,
		PassedCount: int32(passedCount),
		TotalCount:  int32(totalCount),
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
		if err := s.repo.SetWinner(ctx, room.ID, userID, guestName); err != nil {
			return nil, err
		}
		if err := s.repo.FinishDuel(ctx, room.ID, userID, guestName, finishedAt); err != nil {
			return nil, err
		}
	}

	return created, nil
}
