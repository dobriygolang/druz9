package codetasks

import (
	"context"
	"fmt"
	"strings"

	"api/internal/model"

	"github.com/jackc/pgx/v5"
)

const SelectColumns = `
	id,
	title,
	slug,
	statement,
	difficulty,
	topics,
	starter_code,
	language,
	task_type,
	execution_profile,
	runner_mode,
	duration_seconds,
	fixture_files,
	readable_paths,
	writable_paths,
	allowed_hosts,
	allowed_ports,
	mock_endpoints,
	writable_temp_dir,
	is_active,
	created_at,
	updated_at
`

func SelectColumnsWithAlias(alias string) string {
	if alias == "" {
		return SelectColumns
	}

	fields := []string{
		"id",
		"title",
		"slug",
		"statement",
		"difficulty",
		"topics",
		"starter_code",
		"language",
		"task_type",
		"execution_profile",
		"runner_mode",
		"duration_seconds",
		"fixture_files",
		"readable_paths",
		"writable_paths",
		"allowed_hosts",
		"allowed_ports",
		"mock_endpoints",
		"writable_temp_dir",
		"is_active",
		"created_at",
		"updated_at",
	}
	for i, field := range fields {
		fields[i] = alias + "." + field
	}
	return strings.Join(fields, ",\n\t\t\t")
}

type Scanner interface {
	Scan(dest ...any) error
}

type Queryer interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

func ScanTask(scanner Scanner, task *model.CodeTask) error {
	if task == nil {
		return fmt.Errorf("scan code task: nil task")
	}

	var difficultyValue int
	var languageValue int
	var taskTypeValue int
	var executionProfile string
	var runnerModeValue int
	if err := scanner.Scan(
		&task.ID,
		&task.Title,
		&task.Slug,
		&task.Statement,
		&difficultyValue,
		&task.Topics,
		&task.StarterCode,
		&languageValue,
		&taskTypeValue,
		&executionProfile,
		&runnerModeValue,
		&task.DurationSeconds,
		&task.FixtureFiles,
		&task.ReadablePaths,
		&task.WritablePaths,
		&task.AllowedHosts,
		&task.AllowedPorts,
		&task.MockEndpoints,
		&task.WritableTempDir,
		&task.IsActive,
		&task.CreatedAt,
		&task.UpdatedAt,
	); err != nil {
		return err
	}

	task.Difficulty = model.TaskDifficulty(difficultyValue)
	task.Language = model.ProgrammingLanguage(languageValue)
	task.TaskType = model.TaskType(taskTypeValue)
	task.ExecutionProfile = model.ExecutionProfileFromString(executionProfile)
	task.RunnerMode = model.RunnerMode(runnerModeValue)
	if task.RunnerMode.String() == "" {
		task.RunnerMode = model.RunnerModeProgram
	}
	return nil
}

func LoadCases(ctx context.Context, db Queryer, task *model.CodeTask) error {
	if task == nil {
		return fmt.Errorf("load code task cases: nil task")
	}
	return LoadCasesMultiple(ctx, db, []*model.CodeTask{task})
}

// LoadCasesMultiple loads test cases for multiple tasks in a single query (batch optimization).
func LoadCasesMultiple(ctx context.Context, db Queryer, tasks []*model.CodeTask) error {
	if len(tasks) == 0 {
		return nil
	}

	// Collect all task IDs
	taskIDs := make([]string, 0, len(tasks))
	for _, task := range tasks {
		if task != nil {
			taskIDs = append(taskIDs, task.ID.String())
		}
	}
	if len(taskIDs) == 0 {
		return nil
	}

	rows, err := db.Query(ctx, `
		SELECT id, task_id, input, expected_output, is_public, weight, "order"
		FROM code_task_test_cases
		WHERE task_id = ANY($1)
		ORDER BY task_id, "order" ASC, is_public DESC
	`, taskIDs)
	if err != nil {
		return fmt.Errorf("load code task cases batch: %w", err)
	}
	defer rows.Close()

	// Build lookup map
	casesByTaskID := make(map[string][]*model.CodeTestCase)
	for rows.Next() {
		var testCase model.CodeTestCase
		if err := rows.Scan(&testCase.ID, &testCase.TaskID, &testCase.Input, &testCase.ExpectedOutput, &testCase.IsPublic, &testCase.Weight, &testCase.Order); err != nil {
			return fmt.Errorf("scan code task case: %w", err)
		}
		copyCase := testCase
		casesByTaskID[testCase.TaskID.String()] = append(casesByTaskID[testCase.TaskID.String()], &copyCase)
	}

	// Assign cases to tasks
	for _, task := range tasks {
		if task == nil {
			continue
		}
		task.PublicTestCases = nil
		task.HiddenTestCases = nil
		taskID := task.ID.String()
		if cases, ok := casesByTaskID[taskID]; ok {
			for _, tc := range cases {
				if tc.IsPublic {
					task.PublicTestCases = append(task.PublicTestCases, tc)
				} else {
					task.HiddenTestCases = append(task.HiddenTestCases, tc)
				}
			}
		}
	}
	return nil
}

func ScanPlayerTask(scanner Scanner, task *model.CodeTask) error {
	if err := ScanTask(scanner, task); err != nil {
		return err
	}
	task.FixtureFiles = nil
	task.ReadablePaths = nil
	task.WritablePaths = nil
	task.AllowedHosts = nil
	task.AllowedPorts = nil
	task.MockEndpoints = nil
	task.WritableTempDir = false
	return nil
}
