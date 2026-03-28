package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateTask(ctx context.Context, req *v1.CreateTaskRequest) (*v1.TaskResponse, error) {
	task := taskFromCreateRequest(req)

	created, err := i.service.CreateTask(ctx, task)
	if err != nil {
		if errors.Is(err, codeeditordomain.ErrTaskNotFound) {
			return nil, errors.NotFound("TASK_NOT_FOUND", "task not found")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.TaskResponse{Task: mapTask(created)}, nil
}
