package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) CreateTask(ctx context.Context, req *v1.CreateTaskRequest) (*v1.TaskResponse, error) {
	task := taskFromCreateRequest(req)
	created, err := i.service.CreateTask(ctx, task)
	if err != nil {
		return nil, mapErr(err)
	}
	return &v1.TaskResponse{Task: mapTask(created)}, nil
}
