package sandbox

import (
	"api/internal/policy"
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	defaultTimeout  = 10 * time.Second
	maxOutputSize   = 64 * 1024 // 64KB max output
	requestHeadroom = 500 * time.Millisecond
	minExecBudget   = 100 * time.Millisecond
	privateFileMode = 0o600
)

// Service executes Go code in isolated environment.
type Service struct{}

type ExecutionRequest struct {
	Code       string
	Input      string
	Task       policy.TaskSpec
	Files      map[string]string
	Language   policy.Language
	RunnerMode string
}

type ExecutionResult struct {
	Output       string
	Policy       policy.SandboxPolicy
	RunnerConfig policy.RunnerConfig
	Truncated    bool
}

// New creates a new sandbox service.
func New() *Service {
	return &Service{}
}

func (s *Service) Execute(ctx context.Context, req ExecutionRequest) (ExecutionResult, error) {
	if req.Language == "" {
		req.Language = policy.LanguageGo
	}
	req.Task.Language = req.Language

	resolvedPolicy, err := policy.ResolvePolicy(req.Task)
	if err != nil {
		return ExecutionResult{}, err
	}
	runnerConfig, err := policy.BuildRunnerConfig(resolvedPolicy, req.Task)
	if err != nil {
		return ExecutionResult{}, err
	}
	output, truncated, err := s.runWithConfig(ctx, req, runnerConfig)
	if err != nil {
		return ExecutionResult{}, err
	}

	return ExecutionResult{
		Output:       output,
		Policy:       resolvedPolicy,
		RunnerConfig: runnerConfig,
		Truncated:    truncated,
	}, nil
}

func (s *Service) runWithConfig(ctx context.Context, req ExecutionRequest, cfg policy.RunnerConfig) (string, bool, error) {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	timeout, err := effectiveExecutionTimeout(ctx, timeout)
	if err != nil {
		return "", false, err
	}
	execCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Create temporary directory
	tmpDir, err := os.MkdirTemp("", "sandbox-*")
	if err != nil {
		return "", false, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := materializeFiles(tmpDir, req.Files, cfg.Filesystem); err != nil {
		return "", false, err
	}

	runArgs, err := prepareGoSources(tmpDir, req)
	if err != nil {
		return "", false, err
	}

	execEnv, err := buildExecutionEnv(tmpDir, cfg.MinimalEnv)
	if err != nil {
		return "", false, err
	}

	// #nosec G204 -- arguments are constrained to generated local Go sources inside the sandbox temp dir.
	cmd := exec.CommandContext(execCtx, "go", append([]string{"run"}, runArgs...)...)
	cmd.Dir = tmpDir
	cmd.Env = execEnv
	cmd.Stdin = bytes.NewBufferString(req.Input)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if errors.Is(execCtx.Err(), context.DeadlineExceeded) {
			return "", false, fmt.Errorf("execution timed out after %s", timeout)
		}

		outputStr := strings.TrimSpace(string(output))
		if outputStr == "" {
			return "", false, fmt.Errorf("go run failed: %v", err)
		}
		return "", false, fmt.Errorf("%s", outputStr)
	}

	outputStr := string(output)
	outputLimit := cfg.Limits.OutputBytes
	if outputLimit <= 0 {
		outputLimit = maxOutputSize
	}
	if len(outputStr) > outputLimit {
		return outputStr[:outputLimit] + "\n... (output truncated)", true, nil
	}

	return outputStr, false, nil
}

func prepareGoSources(root string, req ExecutionRequest) ([]string, error) {
	mode := strings.TrimSpace(req.RunnerMode)
	if mode == "" {
		mode = "program"
	}

	switch mode {
	case "function_io":
		solutionFile := filepath.Join(root, "solution.go")
		if err := os.WriteFile(solutionFile, []byte(req.Code), privateFileMode); err != nil {
			return nil, fmt.Errorf("write solution file: %w", err)
		}
		wrapperFile := filepath.Join(root, "main.go")
		if err := os.WriteFile(wrapperFile, []byte(goFunctionIOWrapper()), privateFileMode); err != nil {
			return nil, fmt.Errorf("write wrapper file: %w", err)
		}
		return []string{"."}, nil
	default:
		mainFile := filepath.Join(root, "main.go")
		if err := os.WriteFile(mainFile, []byte(req.Code), privateFileMode); err != nil {
			return nil, fmt.Errorf("write code file: %w", err)
		}
		return []string{mainFile}, nil
	}
}

func goFunctionIOWrapper() string {
	return `package main

import (
	"fmt"
	"io"
	"os"
)

func main() {
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		panic(err)
	}
	fmt.Print(solve(string(input)))
}
`
}

func effectiveExecutionTimeout(ctx context.Context, requested time.Duration) (time.Duration, error) {
	if requested <= 0 {
		requested = defaultTimeout
	}

	if err := ctx.Err(); err != nil {
		return 0, err
	}

	deadline, ok := ctx.Deadline()
	if !ok {
		return requested, nil
	}

	remaining := time.Until(deadline) - requestHeadroom
	if remaining < minExecBudget {
		return 0, fmt.Errorf("not enough time remaining to execute code")
	}
	if remaining < requested {
		return remaining, nil
	}
	return requested, nil
}

func buildExecutionEnv(root string, base []string) ([]string, error) {
	homeDir := filepath.Join(root, ".home")
	cacheDir, err := sharedGoCacheDir()
	if err != nil {
		return nil, err
	}
	xdgCacheDir := filepath.Join(homeDir, ".cache")

	for _, dir := range []string{homeDir, xdgCacheDir, cacheDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("prepare sandbox env dir %q: %w", dir, err)
		}
	}

	env := append([]string{}, base...)
	env = append(env,
		"HOME="+homeDir,
		"GOCACHE="+cacheDir,
		"XDG_CACHE_HOME="+xdgCacheDir,
		"TMPDIR="+root,
	)
	if pathValue := os.Getenv("PATH"); pathValue != "" {
		env = append(env, "PATH="+pathValue)
	}

	return env, nil
}

func sharedGoCacheDir() (string, error) {
	cacheRoot, err := os.UserCacheDir()
	if err != nil || cacheRoot == "" {
		cacheRoot = os.TempDir()
	}
	if cacheRoot == "" {
		return "", fmt.Errorf("resolve go build cache root")
	}
	return filepath.Join(cacheRoot, "druz-sandbox-go-build"), nil
}

func materializeFiles(root string, files map[string]string, fs policy.RunnerFilesystemConfig) error {
	if len(files) == 0 {
		return nil
	}
	if fs.Mode == policy.FilesystemNone {
		return fmt.Errorf("policy forbids filesystem fixtures")
	}

	allowed := make(map[string]struct{}, len(fs.FixtureFiles))
	for _, path := range fs.FixtureFiles {
		allowed[filepath.Clean(path)] = struct{}{}
	}

	for path, content := range files {
		if err := validateMaterializedPath(path, fs); err != nil {
			return err
		}
		cleaned := filepath.Clean(path)
		if fs.Mode == policy.FilesystemFixturesOnly {
			if _, ok := allowed[cleaned]; !ok {
				return fmt.Errorf("fixture file %q is not allowed by policy", path)
			}
		}
		target := filepath.Join(root, cleaned)
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return fmt.Errorf("create fixture dir: %w", err)
		}
		if fs.MaxFileSizeBytes > 0 && int64(len(content)) > fs.MaxFileSizeBytes {
			return fmt.Errorf("fixture file %q exceeds max size", path)
		}
		if err := os.WriteFile(target, []byte(content), privateFileMode); err != nil {
			return fmt.Errorf("write fixture file: %w", err)
		}
	}

	return nil
}

func validateMaterializedPath(path string, fs policy.RunnerFilesystemConfig) error {
	if path == "" {
		return fmt.Errorf("fixture path cannot be empty")
	}
	if filepath.IsAbs(path) {
		return fmt.Errorf("fixture path %q must be relative", path)
	}
	cleaned := filepath.Clean(path)
	if cleaned == "." || cleaned == ".." || cleaned == "main.go" {
		return fmt.Errorf("fixture path %q is not allowed", path)
	}
	if len(cleaned) >= 3 && cleaned[:3] == ".."+string(filepath.Separator) {
		return fmt.Errorf("fixture path %q escapes workspace", path)
	}
	return nil
}

// NormalizeOutput normalizes judge output for comparison.
// Trims whitespace and normalizes line endings.
func NormalizeOutput(value string) string {
	return strings.TrimSpace(value)
}
