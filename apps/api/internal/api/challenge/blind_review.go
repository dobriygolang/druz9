package challenge

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/challenge/v1"
)

func (i *Implementation) GetBlindReviewTask(ctx context.Context, _ *v1.GetBlindReviewTaskRequest) (*v1.BlindReviewTask, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	task, err := i.service.GetBlindReviewTask(ctx, user.ID)
	if err != nil || task == nil {
		return nil, errors.NotFound("NOT_FOUND", "no tasks available")
	}
	return mapBlindReviewTask(task), nil
}

func (i *Implementation) SubmitBlindReview(ctx context.Context, req *v1.SubmitBlindReviewRequest) (*v1.BlindReviewResult, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	srcID, err := apihelpers.ParseUUID(req.GetSourceReviewId(), "INVALID_SOURCE_REVIEW_ID", "source_review_id")
	if err != nil {
		return nil, err
	}
	taskID, err := apihelpers.ParseUUID(req.GetTaskId(), "INVALID_TASK_ID", "task_id")
	if err != nil {
		return nil, err
	}
	result, err := i.service.SubmitBlindReview(ctx, user.ID, srcID, taskID, req.GetSourceCode(), req.GetSourceLanguage(), req.GetUserReview())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", err.Error())
	}
	return mapBlindReviewResult(result), nil
}
