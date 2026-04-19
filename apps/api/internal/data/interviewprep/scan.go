package interviewprep

import (
	"fmt"

	"api/internal/model"
)

func scanTask(s scanner) (*model.InterviewPrepTask, error) {
	var item model.InterviewPrepTask
	var prepType string
	if err := s.Scan(
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Statement,
		&prepType,
		&item.Language,
		&item.CompanyTag,
		&item.SupportedLanguages,
		&item.IsExecutable,
		&item.ExecutionProfile,
		&item.RunnerMode,
		&item.DurationSeconds,
		&item.StarterCode,
		&item.ReferenceSolution,
		&item.CodeTaskID,
		&item.IsActive,
		&item.AIReviewPrompt,
		&item.IsPracticeEnabled,
		&item.IsMockEnabled,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan task: %w", err)
	}
	item.PrepType = model.InterviewPrepTypeFromRoundType(prepType)
	return &item, nil
}

// scanTaskWithPoolCount reads the same row plus a trailing INT pool
// count column. Used by the admin list so the UI can warn when a
// tagged task isn't in any pool.
func scanTaskWithPoolCount(s scanner) (*model.InterviewPrepTask, error) {
	var item model.InterviewPrepTask
	var prepType string
	if err := s.Scan(
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Statement,
		&prepType,
		&item.Language,
		&item.CompanyTag,
		&item.SupportedLanguages,
		&item.IsExecutable,
		&item.ExecutionProfile,
		&item.RunnerMode,
		&item.DurationSeconds,
		&item.StarterCode,
		&item.ReferenceSolution,
		&item.CodeTaskID,
		&item.IsActive,
		&item.AIReviewPrompt,
		&item.IsPracticeEnabled,
		&item.IsMockEnabled,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.PoolCount,
	); err != nil {
		return nil, fmt.Errorf("scan task with pool count: %w", err)
	}
	item.PrepType = model.InterviewPrepTypeFromRoundType(prepType)
	return &item, nil
}

func scanQuestion(s scanner) (*model.InterviewPrepQuestion, error) {
	var item model.InterviewPrepQuestion
	if err := s.Scan(
		&item.ID,
		&item.TaskID,
		&item.Position,
		&item.Prompt,
		&item.Answer,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan question: %w", err)
	}
	return &item, nil
}

func scanSession(s scanner) (*model.InterviewPrepSession, error) {
	var item model.InterviewPrepSession
	var status string
	if err := s.Scan(
		&item.ID,
		&item.UserID,
		&item.TaskID,
		&status,
		&item.CurrentQuestionPosition,
		&item.SolveLanguage,
		&item.Code,
		&item.LastSubmissionPassed,
		&item.StartedAt,
		&item.FinishedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan session: %w", err)
	}
	item.Status = model.InterviewPrepSessionStatusFromString(status)
	return &item, nil
}

func scanQuestionResult(s scanner) (*model.InterviewPrepQuestionResult, error) {
	var item model.InterviewPrepQuestionResult
	var assessment string
	if err := s.Scan(
		&item.ID,
		&item.SessionID,
		&item.QuestionID,
		&item.Position,
		&item.PromptSnapshot,
		&item.AnswerSnapshot,
		&assessment,
		&item.AnsweredAt,
	); err != nil {
		return nil, fmt.Errorf("scan question result: %w", err)
	}
	item.SelfAssessment = model.InterviewPrepSelfAssessmentFromString(assessment)
	return &item, nil
}

func scanMockSession(s scanner) (*model.InterviewPrepMockSession, error) {
	var item model.InterviewPrepMockSession
	var status string
	if err := s.Scan(
		&item.ID,
		&item.UserID,
		&item.CompanyTag,
		&item.BlueprintSlug,
		&item.BlueprintTitle,
		&item.TrackSlug,
		&item.IntroText,
		&item.ClosingText,
		&status,
		&item.CurrentStageIndex,
		&item.StartedAt,
		&item.FinishedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	item.Status = model.InterviewPrepMockSessionStatusFromString(status)
	return &item, nil
}

func scanMockStage(s scanner) (*model.InterviewPrepMockStage, error) {
	var item model.InterviewPrepMockStage
	var status string
	if err := s.Scan(
		&item.ID,
		&item.SessionID,
		&item.StageIndex,
		&item.RoundType,
		&item.Title,
		&status,
		&item.TaskID,
		&item.BlueprintRoundID,
		&item.SourcePoolID,
		&item.SolveLanguage,
		&item.Code,
		&item.DurationSeconds,
		&item.EvaluatorMode,
		&item.CandidateInstructions,
		&item.InterviewerInstructions,
		&item.LastSubmissionPassed,
		&item.ReviewScore,
		&item.ReviewSummary,
		&item.StartedAt,
		&item.FinishedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	item.Kind = model.InterviewPrepMockStageKindFromRoundType(item.RoundType)
	item.Status = model.InterviewPrepMockStageStatusFromString(status)
	return &item, nil
}

func scanMockQuestionResult(s scanner) (*model.InterviewPrepMockQuestionResult, error) {
	var item model.InterviewPrepMockQuestionResult
	var questionKey string
	if err := s.Scan(
		&item.ID,
		&item.StageID,
		&item.Position,
		&item.Prompt,
		&item.ReferenceAnswer,
		&item.Score,
		&item.Summary,
		&item.AnsweredAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	questionKey = fmt.Sprintf("followup-%d", item.Position)
	item.QuestionKey = questionKey
	return &item, nil
}

func scanMockBlueprintSummary(s scanner) (*model.InterviewMockBlueprintSummary, error) {
	var item model.InterviewMockBlueprintSummary
	if err := s.Scan(
		&item.ID,
		&item.TrackSlug,
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.Level,
		&item.TotalDurationSeconds,
		&item.IntroText,
		&item.PublicAliasSlugs,
		&item.PublicAliasNames,
	); err != nil {
		return nil, err
	}
	return &item, nil
}

func scanBlueprintRound(s scanner) (*model.InterviewBlueprintRound, error) {
	var item model.InterviewBlueprintRound
	if err := s.Scan(
		&item.ID,
		&item.BlueprintID,
		&item.Position,
		&item.RoundType,
		&item.Title,
		&item.SelectionMode,
		&item.FixedItemID,
		&item.PoolID,
		&item.DurationSeconds,
		&item.EvaluatorMode,
		&item.MaxFollowupCount,
		&item.CandidateInstructionsOverride,
		&item.InterviewerInstructionsOverride,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &item, nil
}
