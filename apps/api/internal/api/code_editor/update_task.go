package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) UpdateTask(ctx context.Context, req *v1.UpdateTaskRequest) (*v1.TaskResponse, error) {
	taskID, err := uuid.Parse(req.TaskId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_TASK_ID", "invalid task id")
	}

	task := taskFromUpdateRequest(taskID, req)
	updated, err := i.service.UpdateTask(ctx, task)
	if err != nil {
		return nil, mapErr(err)
	}

	return &v1.TaskResponse{Task: mapTask(updated)}, nil
}
