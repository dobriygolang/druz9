package taskjudge

import (
	"context"
	"strings"
	"time"

	"api/internal/model"
	"api/internal/policy"
	"api/internal/sandbox"
)

type Executor interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

type Result struct {
	Passed          bool
	PassedCount     int32
	TotalCount      int32
	LastOutput      string
	LastError       string
	FailedTestIndex int32
	FailureKind     model.ArenaSubmissionFailureKind
	RuntimeMs       int64
}

func EvaluateCodeTask(ctx context.Context, executor Executor, task *model.CodeTask, code string, overrideLanguage ...string) (Result, error) {
	result := Result{}
	if task == nil {
		return result, nil
	}

	testCases := append([]*model.CodeTestCase{}, task.PublicTestCases...)
	testCases = append(testCases, task.HiddenTestCases...)
	result.TotalCount = safeInt32(len(testCases))

	startedAt := time.Now()
	taskSpec := policy.TaskSpecFromCodeTask(task, policy.TaskTypeAlgorithmPractice)
	taskLanguage := policy.LanguageForProgrammingLanguage(task.Language)
	selectedLanguage := ""
	if len(overrideLanguage) > 0 {
		selectedLanguage = overrideLanguage[0]
	}
	switch strings.TrimSpace(strings.ToLower(selectedLanguage)) {
	case "go":
		taskLanguage = policy.LanguageGo
	case "python":
		taskLanguage = policy.LanguagePython
	case "sql":
		taskLanguage = policy.LanguageSQL
	}

	for i, tc := range testCases {
		execResult, runErr := executor.Execute(ctx, sandbox.ExecutionRequest{
			Code:       code,
			Input:      tc.Input,
			Task:       taskSpec,
			Language:   taskLanguage,
			RunnerMode: task.RunnerMode.String(),
		})
		if runErr != nil {
			result.LastError = strings.TrimSpace(runErr.Error())
			if result.LastError == "" {
				result.LastError = "sandbox execution failed"
			}
			result.FailedTestIndex = int32(i + 1) //nolint:gosec // test case index is bounded by small TestCases slice
			result.FailureKind = detectFailureKind(result.LastError)
			if result.FailureKind == model.ArenaSubmissionFailureKindCompileError {
				result.FailedTestIndex = 0
			}
			result.RuntimeMs = time.Since(startedAt).Milliseconds()
			return result, nil
		}

		result.LastOutput = execResult.Output
		if sandbox.NormalizeOutput(execResult.Output) == sandbox.NormalizeOutput(tc.ExpectedOutput) {
			result.PassedCount++
			continue
		}

		result.LastError = "wrong answer"
		result.FailedTestIndex = int32(i + 1) //nolint:gosec // test case index is bounded by small TestCases slice
		result.FailureKind = model.ArenaSubmissionFailureKindWrongAnswer
		result.RuntimeMs = time.Since(startedAt).Milliseconds()
		return result, nil
	}

	result.Passed = result.TotalCount > 0 && result.PassedCount == result.TotalCount
	result.RuntimeMs = time.Since(startedAt).Milliseconds()
	return result, nil
}

func detectFailureKind(errText string) model.ArenaSubmissionFailureKind {
	lowerErr := strings.ToLower(strings.TrimSpace(errText))
	switch {
	case strings.Contains(lowerErr, "timed out"),
		strings.Contains(lowerErr, "timeout"):
		return model.ArenaSubmissionFailureKindTimeout
	case strings.Contains(lowerErr, "compile"),
		strings.Contains(lowerErr, "syntax error"),
		strings.Contains(lowerErr, "undefined:"),
		strings.Contains(lowerErr, "undeclared"),
		strings.Contains(lowerErr, "cannot use"),
		strings.Contains(lowerErr, "declared and not used"),
		strings.Contains(lowerErr, "imported and not used"),
		strings.Contains(lowerErr, "missing return"),
		strings.Contains(lowerErr, "too many arguments in call"),
		strings.Contains(lowerErr, "not enough arguments in call"),
		strings.Contains(lowerErr, "indentationerror"),
		strings.Contains(lowerErr, "sqlite error"),
		strings.Contains(lowerErr, "parse error"):
		return model.ArenaSubmissionFailureKindCompileError
	case strings.Contains(lowerErr, "wrong answer"):
		return model.ArenaSubmissionFailureKindWrongAnswer
	default:
		return model.ArenaSubmissionFailureKindRuntimeError
	}
}

func safeInt32(value int) int32 {
	if value > int(^uint32(0)>>1) {
		return int32(^uint32(0) >> 1)
	}
	if value < -int(^uint32(0)>>1)-1 {
		return -int32(^uint32(0)>>1) - 1
	}
	return int32(value)
}
