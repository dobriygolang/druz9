package challenge

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/model"
	v1 "api/pkg/api/challenge/v1"
)

func (i *Implementation) GetBlindReviewTask(ctx context.Context, _ *v1.GetBlindReviewTaskRequest) (*v1.BlindReviewTask, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	task, err := i.service.GetBlindReviewTask(ctx, user.ID)
	if err != nil || task == nil {
		return nil, errors.NotFound("NOT_FOUND", "no tasks available")
	}
	return mapBlindReviewTask(task), nil
}

func (i *Implementation) SubmitBlindReview(ctx context.Context, req *v1.SubmitBlindReviewRequest) (*v1.BlindReviewResult, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	srcID, err := uuid.Parse(req.GetSourceReviewId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_SOURCE_REVIEW_ID", "invalid source review id")
	}
	taskID, err := uuid.Parse(req.GetTaskId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_TASK_ID", "invalid task id")
	}
	result, err := i.service.SubmitBlindReview(ctx, user.ID, srcID, taskID, req.GetSourceCode(), req.GetSourceLanguage(), req.GetUserReview())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", err.Error())
	}
	return mapBlindReviewResult(result), nil
}
