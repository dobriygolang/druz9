package challenge

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/challenge/v1"
)

func mapBlindReviewTask(src *model.BlindReviewTask) *v1.BlindReviewTask {
	if src == nil {
		return nil
	}
	return &v1.BlindReviewTask{
		SourceReviewId: src.SourceReviewID.String(),
		TaskId:         src.TaskID.String(),
		TaskTitle:      src.TaskTitle,
		TaskStatement:  src.TaskStatement,
		Code:           src.Code,
		Language:       src.Language,
	}
}

func mapBlindReviewResult(src *model.BlindReviewResult) *v1.BlindReviewResult {
	if src == nil {
		return nil
	}
	return &v1.BlindReviewResult{
		Id:          src.ID.String(),
		AiScore:     src.AIScore,
		AiFeedback:  src.AIFeedback,
		SubmittedAt: timestamppb.New(src.SubmittedAt),
	}
}

func mapTaskRecord(src model.TaskRecord) *v1.TaskRecord {
	return &v1.TaskRecord{
		TaskId:      src.TaskID.String(),
		TaskTitle:   src.TaskTitle,
		BestTimeMs:  src.BestTimeMs,
		BestAiScore: src.BestAIScore,
		Attempts:    src.Attempts,
		LastAt:      timestamppb.New(src.LastAt),
	}
}

func mapWeeklyEntry(src *model.WeeklyEntry) *v1.WeeklyEntry {
	if src == nil {
		return nil
	}
	return &v1.WeeklyEntry{
		UserId:      src.UserID.String(),
		DisplayName: src.DisplayName,
		AvatarUrl:   src.AvatarURL,
		AiScore:     src.AIScore,
		SolveTimeMs: src.SolveTimeMs,
		SubmittedAt: timestamppb.New(src.SubmittedAt),
	}
}

func mapWeeklyInfo(src *model.WeeklyInfo) *v1.WeeklyInfo {
	if src == nil {
		return nil
	}
	return &v1.WeeklyInfo{
		WeekKey:    src.WeekKey,
		TaskId:     src.TaskID.String(),
		TaskTitle:  src.TaskTitle,
		TaskSlug:   src.TaskSlug,
		Difficulty: src.Difficulty,
		EndsAt:     timestamppb.New(src.EndsAt),
	}
}
