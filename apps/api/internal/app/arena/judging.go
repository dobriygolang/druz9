package arena

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"api/internal/app/taskjudge"
	domain "api/internal/domain/arena"
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
	if err := s.repo.SavePlayerCode(ctx, matchID, user.ID, code); err != nil {
		return nil, nil, fmt.Errorf("save player code: %w", err)
	}

	judgeResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, task, code)
	if err != nil {
		return nil, nil, fmt.Errorf("evaluate code: %w", err)
	}
	if err != nil {
		return nil, nil, err
	}

	submission := &domain.Submission{
		ID:          uuid.New(),
		MatchID:     matchID,
		UserID:      user.ID,
		Code:        code,
		SubmittedAt: time.Now(),
		TotalCount:  judgeResult.TotalCount,
	}
	submission.PassedCount = judgeResult.PassedCount
	submission.Output = judgeResult.LastOutput
	submission.Error = judgeResult.LastError
	submission.RuntimeMs = judgeResult.RuntimeMs
	submission.IsCorrect = judgeResult.Passed
	submission.FailedTestIndex = judgeResult.FailedTestIndex
	submission.FailureKind = judgeResult.FailureKind

	if !submission.IsCorrect {
		freezeUntil := time.Now().Add(time.Duration(freezePenaltySeconds) * time.Second)
		submission.FreezeUntil = &freezeUntil
		if err := s.repo.SetPlayerFreeze(ctx, matchID, user.ID, &freezeUntil); err != nil {
			return nil, nil, fmt.Errorf("set player freeze: %w", err)
		}
	} else {
		if err := s.repo.SetPlayerFreeze(ctx, matchID, user.ID, nil); err != nil {
			return nil, nil, fmt.Errorf("set player freeze: %w", err)
		}
		if err := s.repo.SetPlayerAccepted(ctx, matchID, user.ID, submission.SubmittedAt, submission.RuntimeMs); err != nil {
			return nil, nil, fmt.Errorf("set player accepted: %w", err)
		}
	}

	created, err := s.repo.CreateSubmission(ctx, submission)
	if err != nil {
		return nil, nil, fmt.Errorf("create submission: %w", err)
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
