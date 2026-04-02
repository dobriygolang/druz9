package interviewprep

import "api/internal/model"

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
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	item.PrepType = model.InterviewPrepTypeFromString(prepType)
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
		return nil, err
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
		return nil, err
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
		&assessment,
		&item.AnsweredAt,
	); err != nil {
		return nil, err
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
	var kind string
	var status string
	if err := s.Scan(
		&item.ID,
		&item.SessionID,
		&item.StageIndex,
		&kind,
		&status,
		&item.TaskID,
		&item.SolveLanguage,
		&item.Code,
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
	item.Kind = model.InterviewPrepMockStageKindFromString(kind)
	item.Status = model.InterviewPrepMockStageStatusFromString(status)
	return &item, nil
}

func scanMockQuestionResult(s scanner) (*model.InterviewPrepMockQuestionResult, error) {
	var item model.InterviewPrepMockQuestionResult
	if err := s.Scan(
		&item.ID,
		&item.StageID,
		&item.Position,
		&item.QuestionKey,
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
	return &item, nil
}
