package code_editor

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"
)

func (i *Implementation) DeleteTask(ctx context.Context, req *v1.DeleteTaskRequest) (*v1.StatusResponse, error) {
	taskID, err := uuid.Parse(req.GetTaskId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_TASK_ID", "invalid task id")
	}

	if err := i.service.DeleteTask(ctx, taskID); err != nil {
		return nil, mapErr(err)
	}

	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
