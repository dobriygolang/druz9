package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
)

func taskFromCreateRequest(req *v1.CreateTaskRequest) *codeeditordomain.Task {
	return buildTaskFromRequest(uuid.New(), req)
}

func taskFromUpdateRequest(taskID uuid.UUID, req *v1.UpdateTaskRequest) *codeeditordomain.Task {
	return buildTaskFromUpdateRequest(taskID, req)
}

func buildTaskFromRequest(taskID uuid.UUID, req *v1.CreateTaskRequest) *codeeditordomain.Task {
	return &codeeditordomain.Task{
		ID:               taskID,
		Title:            req.Title,
		Slug:             req.Slug,
		Statement:        req.Statement,
		Difficulty:       protoDifficultyToModel(req.Difficulty),
		Topics:           req.Topics,
		StarterCode:      req.StarterCode,
		Language:         protoLanguageToModel(req.Language),
		TaskType:         protoTaskTypeToModel(req.TaskType),
		ExecutionProfile: model.ExecutionProfileFromString(req.ExecutionProfile),
		RunnerMode:       model.RunnerModeFromString(req.RunnerMode),
		DurationSeconds:  req.DurationSeconds,
		FixtureFiles:     req.FixtureFiles,
		ReadablePaths:    req.ReadablePaths,
		WritablePaths:    req.WritablePaths,
		AllowedHosts:     req.AllowedHosts,
		AllowedPorts:     req.AllowedPorts,
		MockEndpoints:    req.MockEndpoints,
		WritableTempDir:  req.WritableTempDir,
		IsActive:         req.IsActive,
		PublicTestCases:  taskCasesFromProto(req.PublicTestCases),
		HiddenTestCases:  taskCasesFromProto(req.HiddenTestCases),
	}
}

func buildTaskFromUpdateRequest(taskID uuid.UUID, req *v1.UpdateTaskRequest) *codeeditordomain.Task {
	return &codeeditordomain.Task{
		ID:               taskID,
		Title:            req.Title,
		Slug:             req.Slug,
		Statement:        req.Statement,
		Difficulty:       protoDifficultyToModel(req.Difficulty),
		Topics:           req.Topics,
		StarterCode:      req.StarterCode,
		Language:         protoLanguageToModel(req.Language),
		TaskType:         protoTaskTypeToModel(req.TaskType),
		ExecutionProfile: model.ExecutionProfileFromString(req.ExecutionProfile),
		RunnerMode:       model.RunnerModeFromString(req.RunnerMode),
		DurationSeconds:  req.DurationSeconds,
		FixtureFiles:     req.FixtureFiles,
		ReadablePaths:    req.ReadablePaths,
		WritablePaths:    req.WritablePaths,
		AllowedHosts:     req.AllowedHosts,
		AllowedPorts:     req.AllowedPorts,
		MockEndpoints:    req.MockEndpoints,
		WritableTempDir:  req.WritableTempDir,
		IsActive:         req.IsActive,
		PublicTestCases:  taskCasesFromProto(req.PublicTestCases),
		HiddenTestCases:  taskCasesFromProto(req.HiddenTestCases),
	}
}

func taskCasesFromProto(cases []*v1.TaskTestCase) []*codeeditordomain.TestCase {
	result := make([]*codeeditordomain.TestCase, 0, len(cases))
	for _, testCase := range cases {
		if testCase == nil {
			continue
		}

		id := uuid.Nil
		if testCase.Id != "" {
			if parsedID, err := uuid.Parse(testCase.Id); err == nil {
				id = parsedID
			}
		}

		result = append(result, &codeeditordomain.TestCase{
			ID:             id,
			Input:          testCase.Input,
			ExpectedOutput: testCase.ExpectedOutput,
			IsPublic:       testCase.IsPublic,
			Weight:         testCase.Weight,
			Order:          testCase.Order,
		})
	}
	return result
}
