package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
)

func taskFromCreateRequest(req *v1.CreateTaskRequest) *codeeditordomain.Task {
	return buildTaskFromPayload(uuid.New(), req.Task)
}

func taskFromUpdateRequest(taskID uuid.UUID, req *v1.UpdateTaskRequest) *codeeditordomain.Task {
	return buildTaskFromPayload(taskID, req.Task)
}

func buildTaskFromPayload(taskID uuid.UUID, p *v1.TaskPayload) *codeeditordomain.Task {
	if p == nil {
		return &codeeditordomain.Task{ID: taskID}
	}
	return &codeeditordomain.Task{
		ID:               taskID,
		Title:            p.Title,
		Slug:             p.Slug,
		Statement:        p.Statement,
		Difficulty:       protoDifficultyToModel(p.Difficulty),
		Topics:           p.Topics,
		StarterCode:      p.StarterCode,
		Language:         protoLanguageToModel(p.Language),
		TaskType:         protoTaskTypeToModel(p.TaskType),
		ExecutionProfile: protoExecutionProfileToModel(p.ExecutionProfile),
		RunnerMode:       protoRunnerModeToModel(p.RunnerMode),
		DurationSeconds:  p.DurationSeconds,
		FixtureFiles:     p.FixtureFiles,
		ReadablePaths:    p.ReadablePaths,
		WritablePaths:    p.WritablePaths,
		AllowedHosts:     p.AllowedHosts,
		AllowedPorts:     p.AllowedPorts,
		MockEndpoints:    p.MockEndpoints,
		WritableTempDir:  p.WritableTempDir,
		IsActive:         p.IsActive,
		PublicTestCases:  taskCasesFromProto(p.PublicTestCases),
		HiddenTestCases:  taskCasesFromProto(p.HiddenTestCases),
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
