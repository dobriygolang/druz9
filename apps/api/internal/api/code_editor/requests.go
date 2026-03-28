package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
)

func taskFromCreateRequest(req *v1.CreateTaskRequest) *codeeditordomain.Task {
	return &codeeditordomain.Task{
		ID:               uuid.New(),
		Title:            req.Title,
		Slug:             req.Slug,
		Statement:        req.Statement,
		Difficulty:       req.Difficulty,
		Topics:           req.Topics,
		StarterCode:      req.StarterCode,
		Language:         req.Language,
		TaskType:         req.TaskType,
		ExecutionProfile: req.ExecutionProfile,
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

func taskFromUpdateRequest(taskID uuid.UUID, req *v1.UpdateTaskRequest) *codeeditordomain.Task {
	return &codeeditordomain.Task{
		ID:               taskID,
		Title:            req.Title,
		Slug:             req.Slug,
		Statement:        req.Statement,
		Difficulty:       req.Difficulty,
		Topics:           req.Topics,
		StarterCode:      req.StarterCode,
		Language:         req.Language,
		TaskType:         req.TaskType,
		ExecutionProfile: req.ExecutionProfile,
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
	for _, tc := range cases {
		if tc == nil {
			continue
		}

		id := uuid.Nil
		if tc.Id != "" {
			if parsedID, err := uuid.Parse(tc.Id); err == nil {
				id = parsedID
			}
		}

		result = append(result, &codeeditordomain.TestCase{
			ID:             id,
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			IsPublic:       tc.IsPublic,
			Weight:         tc.Weight,
			Order:          tc.Order,
		})
	}
	return result
}
