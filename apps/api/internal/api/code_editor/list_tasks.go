package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) ListTasks(ctx context.Context, req *v1.ListTasksRequest) (*v1.ListTasksResponse, error) {
	tasks, err := i.service.ListTasks(ctx, codeeditordomain.TaskFilter{
		Topic:           req.GetTopic(),
		Difficulty:      protoDifficultyToModel(req.GetDifficulty()).String(),
		IncludeInactive: req.GetIncludeInactive(),
	})
	if err != nil {
		return nil, mapErr(err)
	}

	result := make([]*v1.Task, 0, len(tasks))
	for _, task := range tasks {
		result = append(result, mapTask(task))
	}

	return &v1.ListTasksResponse{Tasks: result}, nil
}
