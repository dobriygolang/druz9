package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
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
		if errors.Is(err, codeeditordomain.ErrTaskNotFound) {
			return nil, errors.NotFound("TASK_NOT_FOUND", "task not found")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.TaskResponse{Task: mapTask(updated)}, nil
}
