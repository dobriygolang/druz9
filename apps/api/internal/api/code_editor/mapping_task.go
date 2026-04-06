package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapTask(task *codeeditordomain.Task) *v1.Task {
	if task == nil {
		return nil
	}

	return &v1.Task{
		Id:               task.ID.String(),
		Title:            task.Title,
		Slug:             task.Slug,
		Statement:        task.Statement,
		Difficulty:       modelDifficultyToProto(task.Difficulty),
		Topics:           task.Topics,
		StarterCode:      task.StarterCode,
		Language:         modelLanguageToProto(task.Language),
		TaskType:         modelTaskTypeToProto(task.TaskType),
		ExecutionProfile: executionProfileToProto(task.ExecutionProfile),
		RunnerMode:       runnerModeToProto(task.RunnerMode),
		FixtureFiles:     task.FixtureFiles,
		ReadablePaths:    task.ReadablePaths,
		WritablePaths:    task.WritablePaths,
		AllowedHosts:     task.AllowedHosts,
		AllowedPorts:     task.AllowedPorts,
		MockEndpoints:    task.MockEndpoints,
		WritableTempDir:  task.WritableTempDir,
		IsActive:         task.IsActive,
		PublicTestCases:  mapTaskCases(task.PublicTestCases),
		HiddenTestCases:  mapTaskCases(task.HiddenTestCases),
		CreatedAt:        timestamppb.New(task.CreatedAt),
		UpdatedAt:        timestamppb.New(task.UpdatedAt),
	}
}

func mapTaskCases(cases []*codeeditordomain.TestCase) []*v1.TaskTestCase {
	result := make([]*v1.TaskTestCase, 0, len(cases))
	for _, tc := range cases {
		if tc == nil {
			continue
		}
		result = append(result, &v1.TaskTestCase{
			Id:             tc.ID.String(),
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			IsPublic:       tc.IsPublic,
			Weight:         tc.Weight,
			Order:          tc.Order,
		})
	}
	return result
}
