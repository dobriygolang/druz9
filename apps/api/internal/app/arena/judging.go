package arena

import (
	"context"
	"time"

	domain "api/internal/domain/arena"
	"api/internal/policy"
	"api/internal/sandbox"

	"github.com/google/uuid"
)

func (s *Service) SubmitCode(ctx context.Context, matchID uuid.UUID, user *domain.User, code string) (*domain.Submission, *domain.Match, error) {
	if user == nil || (isGuestUser(user) && !s.allowGuestAccess()) {
		return nil, nil, domain.ErrGuestsNotSupported
	}

	match, err := s.GetMatch(ctx, matchID)
	if err != nil {
		return nil, nil, err
	}
	if match.Status != domain.MatchStatusActive {
		return nil, match, domain.ErrMatchNotActive
	}
	player := findPlayer(match, user.ID)
	if player == nil {
		return nil, nil, domain.ErrPlayerNotInMatch
	}
	if player.FreezeUntil != nil && player.FreezeUntil.After(time.Now()) {
		return nil, match, domain.ErrPlayerFrozen
	}

	task := match.Task
	if task == nil {
		return nil, nil, domain.ErrTaskNotFound
	}
	testCases := append([]*domain.TestCase{}, task.PublicTestCases...)
	testCases = append(testCases, task.HiddenTestCases...)
	if err := s.repo.SavePlayerCode(ctx, matchID, user.ID, code); err != nil {
		return nil, nil, err
	}

	submission := &domain.Submission{
		ID:          uuid.New(),
		MatchID:     matchID,
		UserID:      user.ID,
		Code:        code,
		SubmittedAt: time.Now(),
		TotalCount:  safeArenaInt32(len(testCases)),
	}

	var lastOutput string
	var lastError string
	startedAt := time.Now()
	taskSpec := policy.TaskSpecForArenaTask(task)
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
			submission.PassedCount++
			continue
		}
		lastError = "wrong answer"
		break
	}
	submission.Output = lastOutput
	submission.Error = lastError
	submission.RuntimeMs = time.Since(startedAt).Milliseconds()
	submission.IsCorrect = submission.TotalCount > 0 && submission.PassedCount == submission.TotalCount

	if !submission.IsCorrect {
		freezeUntil := time.Now().Add(time.Duration(freezePenaltySeconds) * time.Second)
		submission.FreezeUntil = &freezeUntil
		if err := s.repo.SetPlayerFreeze(ctx, matchID, user.ID, &freezeUntil); err != nil {
			return nil, nil, err
		}
	} else {
		if err := s.repo.SetPlayerFreeze(ctx, matchID, user.ID, nil); err != nil {
			return nil, nil, err
		}
		if err := s.repo.SetPlayerAccepted(ctx, matchID, user.ID, submission.SubmittedAt, submission.RuntimeMs); err != nil {
			return nil, nil, err
		}
	}

	created, err := s.repo.CreateSubmission(ctx, submission)
	if err != nil {
		return nil, nil, err
	}

	match, err = s.GetMatch(ctx, matchID)
	if err != nil {
		return created, nil, err
	}
	if err := s.refreshMatchState(ctx, match); err != nil {
		return created, nil, err
	}
	match, err = s.GetMatch(ctx, matchID)
	if err != nil {
		return created, nil, err
	}

	return created, match, nil
}

func safeArenaInt32(value int) int32 {
	if value > int(^uint32(0)>>1) {
		return int32(^uint32(0) >> 1)
	}
	if value < -int(^uint32(0)>>1)-1 {
		return -int32(^uint32(0)>>1) - 1
	}
	return int32(value)
}
