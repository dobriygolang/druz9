package training

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/training/v1"
)

func (i *Implementation) GetSkillTree(ctx context.Context, req *v1.GetSkillTreeRequest) (*v1.GetSkillTreeResponse, error) {
	_ = req

	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	resp, err := i.service.GetSkillTree(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load training tree")
	}
	return resp, nil
}

func (i *Implementation) GetTask(ctx context.Context, req *v1.GetTaskRequest) (*v1.GetTaskResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	task, err := i.service.GetTask(ctx, user.ID, req.GetModuleId())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load training task")
	}
	if task == nil {
		return nil, errors.NotFound("TASK_NOT_FOUND", "training task not found")
	}

	return &v1.GetTaskResponse{
		Task: &v1.TrainingTask{
			ModuleId:         task.ModuleID,
			TaskId:           task.TaskID,
			Title:            task.Title,
			Topic:            task.Topic,
			Difficulty:       task.Difficulty,
			Statement:        task.Statement,
			Examples:         task.Examples,
			Constraints:      task.Constraints,
			StarterCodes:     task.StarterCodes,
			VisibleTestCases: task.VisibleTests,
			Hints:            task.Hints,
			RewardLabels:     task.RewardLabels,
		},
	}, nil
}

func (i *Implementation) EvaluateTaskSolution(ctx context.Context, req *v1.EvaluateTaskSolutionRequest) (*v1.EvaluateTaskSolutionResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	result, err := i.service.EvaluateTaskSolution(ctx, user.ID, req.GetModuleId(), req.GetLanguage(), req.GetCode(), req.GetMode())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to evaluate training solution")
	}
	if result == nil {
		return nil, errors.NotFound("TASK_NOT_FOUND", "training task not found")
	}

	return &v1.EvaluateTaskSolutionResponse{
		TestResults:  result.TestResults,
		Accepted:     result.Accepted,
		Error:        result.Error,
		PassedCount:  result.PassedCount,
		TotalCount:   result.TotalCount,
		SubmissionId: result.SubmissionID,
		RewardLabels: result.RewardLabels,
	}, nil
}
