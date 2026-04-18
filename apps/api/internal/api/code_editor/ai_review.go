package code_editor

import (
	"context"
	"errors"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"

	"api/internal/aireview"
	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"
)

func (i *Implementation) AIReview(ctx context.Context, req *v1.AIReviewRequest) (*v1.AIReviewResponse, error) {
	if len(req.GetCode()) > 10000 {
		return nil, kratosErrors.BadRequest("CODE_TOO_LONG", "code too long")
	}
	review, err := i.reviewer.ReviewInterviewSolution(ctx, aireview.InterviewSolutionReviewRequest{
		CandidateLanguage: req.GetLanguage(),
		CandidateCode:     req.GetCode(),
		TaskTitle:         req.GetTaskTitle(),
		Statement:         req.GetStatement(),
	})
	if err != nil {
		if errors.Is(err, aireview.ErrNotConfigured) {
			return nil, kratosErrors.ServiceUnavailable("AI_REVIEW_NOT_CONFIGURED", "ai review not configured")
		}
		return nil, err
	}
	return &v1.AIReviewResponse{
		Review: &commonv1.InterviewSolutionReview{
			Provider: review.Provider,
			Model:    review.Model,
			Score:    int32(review.Score),

			Summary:           review.Summary,
			Strengths:         review.Strengths,
			Issues:            review.Issues,
			FollowUpQuestions: review.FollowUpQuestions,
			Gaps:              review.Gaps,
		},
	}, nil
}
