package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeleteTask(ctx context.Context, req *v1.DeleteTaskRequest) (*v1.DeleteTaskResponse, error) {
	taskID, err := uuid.Parse(req.TaskId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_TASK_ID", "invalid task id")
	}

	if err := i.service.DeleteTask(ctx, taskID); err != nil {
		if errors.Is(err, codeeditordomain.ErrTaskNotFound) {
			return nil, errors.NotFound("TASK_NOT_FOUND", "task not found")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.DeleteTaskResponse{Status: "ok"}, nil
}
