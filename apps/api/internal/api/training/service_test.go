package training_test

import (
	"context"
	"testing"

	training "api/internal/api/training"
	"api/internal/api/training/mocks"
	"api/internal/model"
	v1 "api/pkg/api/training/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestGetSkillTreeReturnsPayload(t *testing.T) {
	userID := uuid.New()
	mockService := mocks.NewService(t)
	mockService.On("GetSkillTree", mock.Anything, userID).Return(&v1.GetSkillTreeResponse{
		SelectedNodeId: "graph-dfs",
	}, nil).Once()

	impl := training.New(mockService)
	ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: userID}})

	resp, err := impl.GetSkillTree(ctx, &v1.GetSkillTreeRequest{})
	if err != nil {
		t.Fatalf("GetSkillTree returned error: %v", err)
	}
	if resp.GetSelectedNodeId() != "graph-dfs" {
		t.Fatalf("unexpected selected node id: %q", resp.GetSelectedNodeId())
	}
}

func TestGetTaskReturnsPayload(t *testing.T) {
	userID := uuid.New()
	mockService := mocks.NewService(t)
	mockService.On("GetTask", mock.Anything, userID, "graph-dfs").Return(&training.TaskView{
		ModuleID:    "graph-dfs",
		TaskID:      "task-1",
		Title:       "Connected Components",
		Topic:       "Graphs · Depth-first search",
		Difficulty:  v1.TrainingTaskDifficulty_TRAINING_TASK_DIFFICULTY_MEDIUM,
		Statement:   "Solve it",
		Constraints: []string{"Keep it linear"},
		VisibleTests: []*v1.TrainingTestCase{{
			Id: "case-1",
		}},
	}, nil).Once()

	impl := training.New(mockService)
	ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: userID}})

	resp, err := impl.GetTask(ctx, &v1.GetTaskRequest{ModuleId: "graph-dfs"})
	if err != nil {
		t.Fatalf("GetTask returned error: %v", err)
	}
	if resp.GetTask().GetTaskId() != "task-1" {
		t.Fatalf("unexpected task id: %q", resp.GetTask().GetTaskId())
	}
}

func TestEvaluateTaskSolutionReturnsPayload(t *testing.T) {
	userID := uuid.New()
	mockService := mocks.NewService(t)
	mockService.On(
		"EvaluateTaskSolution",
		mock.Anything,
		userID,
		"graph-dfs",
		v1.TrainingProgrammingLanguage_TRAINING_PROGRAMMING_LANGUAGE_PYTHON,
		"print(42)",
		v1.TrainingEvaluationMode_TRAINING_EVALUATION_MODE_SUBMIT_ALL,
	).Return(&training.EvaluationResult{
		Accepted: true,
		TestResults: []*v1.TrainingTestResult{{
			Id:     "case-1",
			Status: v1.TrainingTestStatus_TRAINING_TEST_STATUS_PASS,
		}},
		PassedCount:  1,
		TotalCount:   1,
		SubmissionID: "submission-1",
	}, nil).Once()

	impl := training.New(mockService)
	ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: userID}})

	resp, err := impl.EvaluateTaskSolution(ctx, &v1.EvaluateTaskSolutionRequest{
		ModuleId: "graph-dfs",
		Language: v1.TrainingProgrammingLanguage_TRAINING_PROGRAMMING_LANGUAGE_PYTHON,
		Code:     "print(42)",
		Mode:     v1.TrainingEvaluationMode_TRAINING_EVALUATION_MODE_SUBMIT_ALL,
	})
	if err != nil {
		t.Fatalf("EvaluateTaskSolution returned error: %v", err)
	}
	if !resp.GetAccepted() || resp.GetSubmissionId() != "submission-1" {
		t.Fatalf("unexpected response: %+v", resp)
	}
}

func TestGetSkillTreeUnauthorized(t *testing.T) {
	impl := training.New(mocks.NewService(t))
	if _, err := impl.GetSkillTree(context.Background(), &v1.GetSkillTreeRequest{}); err == nil {
		t.Fatal("expected unauthorized error")
	}
}
