package code_editor

import (
	"context"
	"errors"

	"api/internal/aireview"
	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) AIReview(ctx context.Context, req *v1.AIReviewRequest) (*v1.AIReviewResponse, error) {
	if len(req.Code) > 10000 {
		return nil, kratosErrors.BadRequest("CODE_TOO_LONG", "code too long")
	}
	review, err := i.reviewer.ReviewInterviewSolution(ctx, aireview.InterviewSolutionReviewRequest{
		CandidateLanguage: req.Language,
		CandidateCode:     req.Code,
		TaskTitle:         req.TaskTitle,
		Statement:         req.Statement,
	})
	if err != nil {
		if errors.Is(err, aireview.ErrNotConfigured) {
			return nil, kratosErrors.ServiceUnavailable("AI_REVIEW_NOT_CONFIGURED", "ai review not configured")
		}
		return nil, err
	}
	return &v1.AIReviewResponse{
		Review: &commonv1.InterviewSolutionReview{
			Provider:           review.Provider,
			Model:              review.Model,
			Score:              int32(review.Score),
			Summary:            review.Summary,
			Strengths:          review.Strengths,
			Issues:             review.Issues,
			FollowUpQuestions:  review.FollowUpQuestions,
		},
	}, nil
}
