package sandbox

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"api/internal/policy"
)

var (
	errExecutionTimeout    = errors.New("execution timed out")
	errExecutionError      = errors.New("execution error")
	errUnsupportedLanguage = errors.New("unsupported sandbox language")
	errNotEnoughTime        = errors.New("not enough time remaining to execute code")
	errResolveCacheRoot     = errors.New("resolve go build cache root")
	errPolicyFixtures       = errors.New("policy forbids filesystem fixtures")
	errFixtureNotAllowed    = errors.New("fixture file not allowed by policy")
	errFixtureExceedsSize   = errors.New("fixture file exceeds max size")
	errFixturePathEmpty     = errors.New("fixture path cannot be empty")
	errFixtureNotRelative   = errors.New("fixture path must be relative")
	errFixturePathNA        = errors.New("fixture path is not allowed")
	errFixtureEscapes       = errors.New("fixture path escapes workspace")
	errRuntimeNotFound      = errors.New("required runtime not found in PATH")
)

const (
	defaultTimeout  = 10 * time.Second
	maxOutputSize   = 64 * 1024 // 64KB max output
	requestHeadroom = 500 * time.Millisecond
	minExecBudget   = 100 * time.Millisecond
	privateFileMode = 0o600
)

const sqliteBootstrap = ".mode list\n.headers off\n.nullvalue NULL\n"

// Service executes code in an isolated temporary environment.
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
		return ExecutionResult{}, fmt.Errorf("resolve policy: %w", err)
	}
	runnerConfig, err := policy.BuildRunnerConfig(resolvedPolicy, req.Task)
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("build runner config: %w", err)
	}
	output, truncated, err := s.runWithConfig(ctx, req, runnerConfig)
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("run with config: %w", err)
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
	if err := validateExecutionRequest(req, cfg); err != nil {
		return "", false, err
	}

	runDir := tmpDir
	if strings.TrimSpace(req.RunnerMode) == "function_io" {
		runDir = filepath.Join(tmpDir, "work")
	}

	command, runArgs, stdin, err := prepareExecution(tmpDir, req, cfg)
	if err != nil {
		return "", false, err
	}

	networkEnv, proxyServer, err := buildNetworkEnv(execCtx, cfg.Network)
	if err != nil {
		return "", false, err
	}
	if proxyServer != nil {
		defer proxyServer.close()
	}

	execEnv, err := buildExecutionEnv(tmpDir, cfg.MinimalEnv, networkEnv)
	if err != nil {
		return "", false, err
	}

	// #nosec G204 -- command/args are selected from a small fixed allowlist and point to local temp files.
	cmd := exec.CommandContext(execCtx, command, runArgs...)
	cmd.Dir = runDir
	cmd.Env = execEnv
	cmd.Stdin = bytes.NewBufferString(stdin)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if errors.Is(execCtx.Err(), context.DeadlineExceeded) {
			return "", false, fmt.Errorf("%w after %s", errExecutionTimeout, timeout)
		}

		outputStr := strings.TrimSpace(string(output))
		if outputStr == "" {
			return "", false, fmt.Errorf("go run failed: %w", err)
		}
		return "", false, fmt.Errorf("%w: %s", errExecutionError, outputStr)
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

func prepareExecution(root string, req ExecutionRequest, cfg policy.RunnerConfig) (string, []string, string, error) {
	switch req.Language {
	case policy.LanguagePython:
		args, stdin, err := preparePythonSources(root, req)
		if err != nil {
			return "", nil, "", err
		}
		command, lookupErr := resolveRuntimeBinary("python3", []string{
			"/usr/bin/python3",
			"/opt/homebrew/bin/python3",
			"/usr/local/bin/python3",
		})
		if lookupErr != nil {
			return "", nil, "", lookupErr
		}
		return command, args, stdin, nil
	case policy.LanguageSQL:
		args, stdin, err := prepareSQLSources(root, req)
		if err != nil {
			return "", nil, "", err
		}
		command, lookupErr := resolveRuntimeBinary("sqlite3", []string{
			"/usr/bin/sqlite3",
			"/opt/homebrew/bin/sqlite3",
			"/usr/local/bin/sqlite3",
		})
		if lookupErr != nil {
			return "", nil, "", lookupErr
		}
		return command, args, stdin, nil
	case policy.LanguageGo, "":
		args, stdin, err := prepareGoSources(root, req, cfg)
		if err != nil {
			return "", nil, "", err
		}
		command, lookupErr := resolveRuntimeBinary("go", []string{
			"/usr/local/go/bin/go",
			"/opt/homebrew/bin/go",
			"/usr/local/bin/go",
		})
		if lookupErr != nil {
			return "", nil, "", lookupErr
		}
		return command, args, stdin, nil
	default:
		return "", nil, "", fmt.Errorf("%w: %s", errUnsupportedLanguage, req.Language)
	}
}

func prepareGoSources(root string, req ExecutionRequest, cfg policy.RunnerConfig) ([]string, string, error) {
	mode := strings.TrimSpace(req.RunnerMode)
	if mode == "" {
		mode = "program"
	}

	switch mode {
	case "function_io":
		workDir := filepath.Join(root, "work")
		if err := os.MkdirAll(workDir, 0o755); err != nil {
			return nil, "", fmt.Errorf("create work dir: %w", err)
		}

		goModFile := filepath.Join(workDir, "go.mod")
		if err := os.WriteFile(goModFile, []byte("module sandbox\n\ngo 1.20\n"), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write go.mod file: %w", err)
		}

		solutionFile := filepath.Join(workDir, "solution.go")
		if err := os.WriteFile(solutionFile, []byte(normalizeGoFunctionIOSource(req.Code)), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write solution file: %w", err)
		}
		if err := maybeWriteGoHTTPProxyBootstrap(workDir, cfg); err != nil {
			return nil, "", err
		}
		wrapperFile := filepath.Join(workDir, "main.go")
		if err := os.WriteFile(wrapperFile, []byte(goFunctionIOWrapper()), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write wrapper file: %w", err)
		}
		return []string{"run", "."}, req.Input, nil
	default:
		mainFile := filepath.Join(root, "main.go")
		if err := os.WriteFile(mainFile, []byte(normalizeGoPackageSource(req.Code)), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write code file: %w", err)
		}
		if err := maybeWriteGoHTTPProxyBootstrap(root, cfg); err != nil {
			return nil, "", err
		}
		if cfg.Network.Mode == policy.NetworkMockOnly {
			return []string{"run", mainFile, filepath.Join(root, "sandbox_transport.go")}, req.Input, nil
		}
		return []string{"run", mainFile}, req.Input, nil
	}
}

var goPackagePattern = regexp.MustCompile(`(?m)^package\s+\w+`)

func normalizeGoFunctionIOSource(code string) string {
	return normalizeGoPackageSource(code)
}

func normalizeGoPackageSource(code string) string {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return code
	}
	if goPackagePattern.MatchString(code) {
		return goPackagePattern.ReplaceAllString(code, "package main")
	}
	return "package main\n\n" + code
}

func preparePythonSources(root string, req ExecutionRequest) ([]string, string, error) {
	mode := strings.TrimSpace(req.RunnerMode)
	if mode == "" {
		mode = "program"
	}

	switch mode {
	case "function_io":
		workDir := filepath.Join(root, "work")
		if err := os.MkdirAll(workDir, 0o755); err != nil {
			return nil, "", fmt.Errorf("create work dir: %w", err)
		}

		solutionFile := filepath.Join(workDir, "solution.py")
		if err := os.WriteFile(solutionFile, []byte(req.Code), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write solution file: %w", err)
		}
		wrapperFile := filepath.Join(workDir, "main.py")
		if err := os.WriteFile(wrapperFile, []byte(pythonFunctionIOWrapper()), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write wrapper file: %w", err)
		}
		return []string{"main.py"}, req.Input, nil
	default:
		mainFile := filepath.Join(root, "main.py")
		if err := os.WriteFile(mainFile, []byte(req.Code), privateFileMode); err != nil {
			return nil, "", fmt.Errorf("write code file: %w", err)
		}
		return []string{mainFile}, req.Input, nil
	}
}

func prepareSQLSources(root string, req ExecutionRequest) ([]string, string, error) {
	dbFile := filepath.Join(root, "sandbox.db")
	setupScript := sqliteBootstrap + req.Input + "\n.read query.sql\n"
	scriptFile := filepath.Join(root, "setup.sql")
	if err := os.WriteFile(scriptFile, []byte(setupScript), privateFileMode); err != nil {
		return nil, "", fmt.Errorf("write setup script: %w", err)
	}
	queryFile := filepath.Join(root, "query.sql")
	if err := os.WriteFile(queryFile, []byte(req.Code), privateFileMode); err != nil {
		return nil, "", fmt.Errorf("write query file: %w", err)
	}
	return []string{dbFile}, sqliteBootstrap + ".read setup.sql\n", nil
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

func maybeWriteGoHTTPProxyBootstrap(root string, cfg policy.RunnerConfig) error {
	if cfg.Network.Mode != policy.NetworkMockOnly {
		return nil
	}
	bootstrap := filepath.Join(root, "sandbox_transport.go")
	if err := os.WriteFile(bootstrap, []byte(goHTTPProxyBootstrap()), privateFileMode); err != nil {
		return fmt.Errorf("write go http proxy bootstrap: %w", err)
	}
	return nil
}

func goHTTPProxyBootstrap() string {
	return `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

func init() {
	mock := sandboxMockTransport{
		allowedHosts:  splitSandboxCSV(os.Getenv("SANDBOX_ALLOWED_HOSTS")),
		mockEndpoints: splitSandboxCSV(os.Getenv("SANDBOX_MOCK_ENDPOINTS")),
		proxyURL:      os.Getenv("SANDBOX_HTTP_PROXY"),
	}
	http.DefaultTransport = mock
	http.DefaultClient.Transport = mock
}

type sandboxMockTransport struct {
	allowedHosts  []string
	mockEndpoints []string
	proxyURL      string
}

func (t sandboxMockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	target := req.URL.String()
	if !t.isAllowed(req.URL) {
		return sandboxMockResponse(req, http.StatusForbidden, fmt.Sprintf(` + "`" + `{"mock":true,"blocked":true,"url":%q,"reason":"outbound network is blocked"}` + "`" + `, target)), nil
	}

	var body []byte
	if req.Body != nil {
		payload, err := io.ReadAll(req.Body)
		if err != nil {
			return nil, err
		}
		body = payload
		req.Body = io.NopCloser(bytes.NewReader(payload))
	}

	responseBody := fmt.Sprintf(` + "`" + `{"mock":true,"url":%q,"method":%q,"body":%q,"proxy":%q}` + "`" + `, target, req.Method, string(body), t.proxyURL)
	return sandboxMockResponse(req, http.StatusOK, responseBody), nil
}

func (t sandboxMockTransport) isAllowed(target *url.URL) bool {
	host := strings.ToLower(strings.TrimSpace(target.Hostname()))
	if host == "" {
		return false
	}
	for _, allowed := range t.allowedHosts {
		if strings.ToLower(strings.TrimSpace(allowed)) == host {
			return true
		}
	}
	for _, endpoint := range t.mockEndpoints {
		parsed, err := url.Parse(endpoint)
		if err != nil {
			continue
		}
		if strings.ToLower(strings.TrimSpace(parsed.Hostname())) == host {
			return true
		}
	}
	return false
}

func sandboxMockResponse(req *http.Request, status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Status:     fmt.Sprintf("%d %s", status, http.StatusText(status)),
		Header: http.Header{
			"Content-Type":   []string{"application/json"},
			"X-Sandbox-Mock": []string{"true"},
		},
		Body:       io.NopCloser(strings.NewReader(body)),
		Request:    req,
		ProtoMajor: 1,
		ProtoMinor: 1,
	}
}

func splitSandboxCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}
`
}

func pythonFunctionIOWrapper() string {
	return `from solution import solve
import sys

def main():
    data = sys.stdin.read()
    result = solve(data)
    if result is None:
        return
    sys.stdout.write(str(result))

if __name__ == "__main__":
    main()
`
}

func effectiveExecutionTimeout(ctx context.Context, requested time.Duration) (time.Duration, error) {
	if requested <= 0 {
		requested = defaultTimeout
	}

	if err := ctx.Err(); err != nil {
		return 0, fmt.Errorf("context already cancelled: %w", err)
	}

	deadline, ok := ctx.Deadline()
	if !ok {
		return requested, nil
	}

	remaining := time.Until(deadline) - requestHeadroom
	if remaining < minExecBudget {
		return 0, errNotEnoughTime
	}
	if remaining < requested {
		return remaining, nil
	}
	return requested, nil
}

func buildExecutionEnv(root string, base, extra []string) ([]string, error) {
	homeDir := filepath.Join(root, ".home")
	cacheDir, err := sharedGoCacheDir()
	if err != nil {
		return nil, fmt.Errorf("get go cache dir: %w", err)
	}
	xdgCacheDir := filepath.Join(homeDir, ".cache")

	for _, dir := range []string{homeDir, xdgCacheDir, cacheDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("prepare sandbox env dir %q: %w", dir, err)
		}
	}

	env := append([]string{}, base...)
	env = append(env,
		"HOME="+homeDir,
		"GOCACHE="+cacheDir,
		"PYTHONDONTWRITEBYTECODE=1",
		"PYTHONUNBUFFERED=1",
		"XDG_CACHE_HOME="+xdgCacheDir,
		"TMPDIR="+root,
	)
	if pathValue := os.Getenv("PATH"); pathValue != "" {
		env = append(env, "PATH="+pathValue)
	}
	env = append(env, extra...)

	return env, nil
}

func sharedGoCacheDir() (string, error) {
	cacheRoot, err := os.UserCacheDir()
	if err != nil || cacheRoot == "" {
		cacheRoot = os.TempDir()
	}
	if cacheRoot == "" {
		return "", errResolveCacheRoot
	}
	return filepath.Join(cacheRoot, "druz-sandbox-go-build"), nil
}

func materializeFiles(root string, files map[string]string, fs policy.RunnerFilesystemConfig) error {
	if len(files) == 0 {
		return nil
	}
	if fs.Mode == policy.FilesystemNone {
		return errPolicyFixtures
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
				return fmt.Errorf("%w: %q", errFixtureNotAllowed, path)
			}
		}
		target := filepath.Join(root, cleaned)
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return fmt.Errorf("create fixture dir: %w", err)
		}
		if fs.MaxFileSizeBytes > 0 && int64(len(content)) > fs.MaxFileSizeBytes {
			return fmt.Errorf("%w: %q", errFixtureExceedsSize, path)
		}
		if err := os.WriteFile(target, []byte(content), privateFileMode); err != nil {
			return fmt.Errorf("write fixture file: %w", err)
		}
	}

	return nil
}

func validateMaterializedPath(path string, _ policy.RunnerFilesystemConfig) error {
	if path == "" {
		return errFixturePathEmpty
	}
	if filepath.IsAbs(path) {
		return fmt.Errorf("%w: %q", errFixtureNotRelative, path)
	}
	cleaned := filepath.Clean(path)
	if cleaned == "." || cleaned == ".." || cleaned == "main.go" {
		return fmt.Errorf("%w: %q", errFixturePathNA, path)
	}
	if len(cleaned) >= 3 && cleaned[:3] == ".."+string(filepath.Separator) {
		return fmt.Errorf("%w: %q", errFixtureEscapes, path)
	}
	return nil
}

// NormalizeOutput normalizes judge output for comparison.
// Trims whitespace and normalizes line endings.
func NormalizeOutput(value string) string {
	return strings.TrimSpace(value)
}

func resolveRuntimeBinary(name string, absoluteFallbacks []string) (string, error) {
	if resolved, err := exec.LookPath(name); err == nil && resolved != "" {
		return resolved, nil
	}

	for _, candidate := range absoluteFallbacks {
		if candidate == "" {
			continue
		}
		info, err := os.Stat(candidate)
		if err == nil && !info.IsDir() {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("%w: %q", errRuntimeNotFound, name)
}
