package code_editor

import (
	"github.com/google/uuid"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"
)

func taskFromCreateRequest(req *v1.CreateTaskRequest) *codeeditordomain.Task {
	return buildTaskFromPayload(uuid.New(), req.GetTask())
}

func taskFromUpdateRequest(taskID uuid.UUID, req *v1.UpdateTaskRequest) *codeeditordomain.Task {
	return buildTaskFromPayload(taskID, req.GetTask())
}

func buildTaskFromPayload(taskID uuid.UUID, p *v1.TaskPayload) *codeeditordomain.Task {
	if p == nil {
		return &codeeditordomain.Task{ID: taskID}
	}
	return &codeeditordomain.Task{
		ID:               taskID,
		Title:            p.GetTitle(),
		Slug:             p.GetSlug(),
		Statement:        p.GetStatement(),
		Difficulty:       protoDifficultyToModel(p.GetDifficulty()),
		Topics:           p.GetTopics(),
		StarterCode:      p.GetStarterCode(),
		Language:         protoLanguageToModel(p.GetLanguage()),
		TaskType:         protoTaskTypeToModel(p.GetTaskType()),
		ExecutionProfile: protoExecutionProfileToModel(p.GetExecutionProfile()),
		RunnerMode:       protoRunnerModeToModel(p.GetRunnerMode()),
		DurationSeconds:  p.GetDurationSeconds(),
		FixtureFiles:     p.GetFixtureFiles(),
		ReadablePaths:    p.GetReadablePaths(),
		WritablePaths:    p.GetWritablePaths(),
		AllowedHosts:     p.GetAllowedHosts(),
		AllowedPorts:     p.GetAllowedPorts(),
		MockEndpoints:    p.GetMockEndpoints(),
		WritableTempDir:  p.GetWritableTempDir(),
		IsActive:         p.GetIsActive(),
		PublicTestCases:  taskCasesFromProto(p.GetPublicTestCases()),
		HiddenTestCases:  taskCasesFromProto(p.GetHiddenTestCases()),
	}
}

func taskCasesFromProto(cases []*v1.TaskTestCase) []*codeeditordomain.TestCase {
	result := make([]*codeeditordomain.TestCase, 0, len(cases))
	for _, testCase := range cases {
		if testCase == nil {
			continue
		}

		id := uuid.Nil
		if testCase.GetId() != "" {
			if parsedID, err := uuid.Parse(testCase.GetId()); err == nil {
				id = parsedID
			}
		}

		result = append(result, &codeeditordomain.TestCase{
			ID:             id,
			Input:          testCase.GetInput(),
			ExpectedOutput: testCase.GetExpectedOutput(),
			IsPublic:       testCase.GetIsPublic(),
			Weight:         testCase.GetWeight(),
			Order:          testCase.GetOrder(),
		})
	}
	return result
}
