package seeds

import (
	"context"
	"fmt"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

const blind75SeedName = "blind75_pack"
const blind75CatalogPath = "scripts/seeds/catalogs/blind75.json"
const blind75SeedVersion = "v2-function-io"

func (r *Runner) runBlind75(ctx context.Context) (Result, error) {
	catalog, rawCatalog, err := loadCatalog(blind75CatalogPath)
	if err != nil {
		return Result{}, err
	}

	checksum := digest(append(rawCatalog, []byte("|"+blind75SeedVersion)...))
	shouldApply, appliedAt, err := r.shouldApply(ctx, blind75SeedName, seedKindCatalog, checksum)
	if err != nil {
		return Result{}, err
	}
	if !shouldApply {
		return Result{
			Name:      blind75SeedName,
			Kind:      seedKindCatalog,
			Applied:   false,
			Message:   "already applied",
			AppliedAt: appliedAt,
		}, nil
	}

	existing, err := r.codeEditor.ListTasks(ctx, model.CodeTaskFilter{IncludeInactive: true})
	if err != nil {
		return Result{}, fmt.Errorf("list existing tasks for blind75: %w", err)
	}

	bySlug := make(map[string]*model.CodeTask, len(existing))
	for _, task := range existing {
		bySlug[task.Slug] = task
	}

	created := 0
	updated := 0
	for _, taskDef := range catalog.Tasks {
		task := buildBlind75Task(taskDef)
		if current := bySlug[task.Slug]; current != nil {
			task.ID = current.ID
			if _, err := r.codeEditor.UpdateTask(ctx, task); err != nil {
				return Result{}, fmt.Errorf("update blind75 task %s: %w", task.Slug, err)
			}
			updated++
			continue
		}
		if _, err := r.codeEditor.CreateTask(ctx, task); err != nil {
			return Result{}, fmt.Errorf("create blind75 task %s: %w", task.Slug, err)
		}
		created++
	}

	appliedAt = time.Now().UTC()
	if err := r.record(ctx, blind75SeedName, seedKindCatalog, checksum, appliedAt); err != nil {
		return Result{}, err
	}

	return Result{
		Name:      blind75SeedName,
		Kind:      seedKindCatalog,
		Applied:   true,
		Message:   fmt.Sprintf("upserted %d tasks (%d created, %d updated)", len(catalog.Tasks), created, updated),
		AppliedAt: appliedAt,
	}, nil
}

func buildBlind75Task(def CatalogTask) *model.CodeTask {
	taskID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("blind75:"+def.Slug))
	task := &model.CodeTask{
		ID:               taskID,
		Title:            def.Title,
		Slug:             def.Slug,
		Statement:        def.Statement,
		Difficulty:       model.TaskDifficultyFromString(def.Difficulty),
		Topics:           append([]string{"blind75"}, def.Topics...),
		StarterCode:      goFunctionStarterCode(),
		Language:         model.ProgrammingLanguageGo,
		TaskType:         model.TaskTypeAlgorithm,
		ExecutionProfile: model.ExecutionProfilePure,
		RunnerMode:       model.RunnerModeFunctionIO,
		IsActive:         true,
	}

	publicOrder := int32(1)
	hiddenOrder := int32(1)
	for index, c := range def.Cases {
		testCase := &model.CodeTestCase{
			ID:             uuid.NewSHA1(taskID, []byte(fmt.Sprintf("case:%d", index))),
			TaskID:         taskID,
			Input:          normalizeSeedText(c.Input),
			ExpectedOutput: normalizeSeedText(c.Output),
			IsPublic:       c.IsPublic,
			Weight:         1,
		}
		if c.IsPublic {
			testCase.Order = publicOrder
			publicOrder++
			task.PublicTestCases = append(task.PublicTestCases, testCase)
			continue
		}
		testCase.Order = hiddenOrder
		hiddenOrder++
		task.HiddenTestCases = append(task.HiddenTestCases, testCase)
	}
	return task
}

func normalizeSeedText(value string) string {
	trimmed := strings.TrimLeft(value, "\n")
	if strings.HasSuffix(trimmed, "\n") {
		return trimmed
	}
	return trimmed + "\n"
}

func goFunctionStarterCode() string {
	return `package main

func solve(input string) string {
	_ = input
	// TODO: parse input and return the answer as a string.
	return "implement me"
}
`
}
