package code_editor

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) GetSolutionReview(ctx context.Context, req *v1.GetSolutionReviewRequest) (*v1.SolutionReviewResponse, error) {
	if i.reviewService == nil {
		return nil, errors.NotFound("REVIEW_NOT_AVAILABLE", "review service is not configured")
	}

	submissionID, err := uuid.Parse(req.GetSubmissionId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_SUBMISSION_ID", "invalid submission id")
	}

	review, err := i.reviewService.GetReview(ctx, submissionID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	if review == nil {
		return nil, errors.NotFound("REVIEW_NOT_FOUND", "no review found for this submission")
	}

	skillSignals := make(map[string]string)
	for k, v := range review.AISkillSignals {
		skillSignals[k] = v
	}

	return &v1.SolutionReviewResponse{
		Review: &v1.SolutionReview{
			Id:                review.ID.String(),
			SubmissionId:      review.SubmissionID.String(),
			SourceType:        mapReviewSourceType(review.SourceType),
			TaskId:            review.TaskID.String(),
			IsCorrect:         review.IsCorrect,
			AttemptNumber:     int32(review.AttemptNumber),
			SolveTimeMs:       review.SolveTimeMs,
			MedianTimeMs:      review.MedianTimeMs,
			PassedCount:       review.PassedCount,
			TotalCount:        review.TotalCount,
			Status:            mapReviewStatus(review.Status),
			AiVerdict:         mapAIVerdict(review.AIVerdict),
			AiTimeComplexity:  review.AITimeComplexity,
			AiSpaceComplexity: review.AISpaceComplexity,
			AiPattern:         review.AIPattern,
			AiStrengths:       review.AIStrengths,
			AiWeaknesses:      review.AIWeaknesses,
			AiHint:            review.AIHint,
			AiSkillSignals:    skillSignals,
			ComparisonSummary: review.ComparisonSummary,
			CreatedAt:         timestamppb.New(review.CreatedAt),
		},
	}, nil
}
