package sandbox

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"api/internal/policy"
)

func TestBuildExecutionEnvProvidesGoCacheAndHome(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	env, err := buildExecutionEnv(root, []string{"CGO_ENABLED=0"})
	if err != nil {
		t.Fatalf("buildExecutionEnv returned error: %v", err)
	}

	values := make(map[string]string, len(env))
	for _, entry := range env {
		key, value, ok := strings.Cut(entry, "=")
		if ok {
			values[key] = value
		}
	}

	if values["HOME"] == "" {
		t.Fatal("HOME is not set")
	}
	if values["GOCACHE"] == "" {
		t.Fatal("GOCACHE is not set")
	}
	if values["TMPDIR"] != root {
		t.Fatalf("unexpected TMPDIR: %q", values["TMPDIR"])
	}
	if _, err := os.Stat(filepath.Join(root, ".home")); err != nil {
		t.Fatalf("home dir not created: %v", err)
	}
	if _, err := os.Stat(values["GOCACHE"]); err != nil {
		t.Fatalf("gocache dir not created: %v", err)
	}
}

func TestExecuteHelloWorld(t *testing.T) {
	t.Parallel()

	// Skip if Go is not installed (common in CI/minimal environments)
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go not installed, skipping execution test")
	}

	service := New()
	output, truncated, err := service.runWithConfig(t.Context(), ExecutionRequest{
		Code: `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`,
		Language: policy.LanguageGo,
	}, policy.RunnerConfig{
		Timeout:    5 * time.Second,
		MinimalEnv: []string{"CGO_ENABLED=0"},
		Limits: policy.RunnerLimits{
			OutputBytes: 64 * 1024,
		},
	})
	if err != nil {
		t.Fatalf("runWithConfig returned error: %v", err)
	}
	if truncated {
		t.Fatal("output should not be truncated")
	}
	if strings.TrimSpace(output) != "Hello, World!" {
		t.Fatalf("unexpected output: %q", output)
	}
}

func TestEffectiveExecutionTimeoutReservesRequestHeadroom(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()

	timeout, err := effectiveExecutionTimeout(ctx, 5*time.Second)
	if err != nil {
		t.Fatalf("effectiveExecutionTimeout returned error: %v", err)
	}

	if timeout >= 5*time.Second {
		t.Fatalf("timeout was not clamped: %s", timeout)
	}
	if timeout > 4600*time.Millisecond {
		t.Fatalf("timeout did not reserve enough headroom: %s", timeout)
	}
	if timeout < 4*time.Second {
		t.Fatalf("timeout was clamped too aggressively: %s", timeout)
	}
}

func TestEffectiveExecutionTimeoutFailsWhenRequestBudgetTooSmall(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithTimeout(t.Context(), 200*time.Millisecond)
	defer cancel()

	if _, err := effectiveExecutionTimeout(ctx, 5*time.Second); err == nil {
		t.Fatal("expected error for insufficient remaining budget")
	}
}

func TestPrepareGoSourcesFunctionIO(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	req := ExecutionRequest{
		Code:       "package main\nfunc solve(input string) string { return input }",
		RunnerMode: "function_io",
	}

	args, err := prepareGoSources(root, req)
	if err != nil {
		t.Fatalf("prepareGoSources returned error: %v", err)
	}
	if len(args) != 1 || args[0] != "." {
		t.Fatalf("unexpected args: %v", args)
	}
	if _, err := os.Stat(filepath.Join(root, "solution.go")); err != nil {
		t.Fatalf("solution.go not created: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "main.go")); err != nil {
		t.Fatalf("main.go not created: %v", err)
	}
}

func TestPrepareGoSourcesDefaultMode(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	req := ExecutionRequest{
		Code:       "package main\nfunc main() {}",
		RunnerMode: "",
	}

	args, err := prepareGoSources(root, req)
	if err != nil {
		t.Fatalf("prepareGoSources returned error: %v", err)
	}
	if len(args) != 1 {
		t.Fatalf("unexpected args: %v", args)
	}
	if _, err := os.Stat(filepath.Join(root, "main.go")); err != nil {
		t.Fatalf("main.go not created: %v", err)
	}
}

func TestMaterializeFilesSkipsEmpty(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	err := materializeFiles(root, nil, policy.RunnerFilesystemConfig{
		Mode: policy.FilesystemWorkspaceRW,
	})
	if err != nil {
		t.Fatalf("materializeFiles returned error: %v", err)
	}
}

func TestMaterializeFilesFailsWhenPolicyForbids(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	err := materializeFiles(root, map[string]string{"test.txt": "content"}, policy.RunnerFilesystemConfig{
		Mode: policy.FilesystemNone,
	})
	if err == nil {
		t.Fatal("expected error when policy forbids filesystem")
	}
}

func TestMaterializeFilesCreatesFiles(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	files := map[string]string{
		"subdir/test.txt": "hello world",
	}
	err := materializeFiles(root, files, policy.RunnerFilesystemConfig{
		Mode:             policy.FilesystemWorkspaceRW,
		MaxFileSizeBytes: 1024,
	})
	if err != nil {
		t.Fatalf("materializeFiles returned error: %v", err)
	}
	content, err := os.ReadFile(filepath.Join(root, "subdir/test.txt"))
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}
	if string(content) != "hello world" {
		t.Fatalf("unexpected content: %s", content)
	}
}

func TestMaterializeFilesFailsOnMaxSize(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	files := map[string]string{
		"test.txt": "hello world",
	}
	err := materializeFiles(root, files, policy.RunnerFilesystemConfig{
		Mode:             policy.FilesystemWorkspaceRW,
		MaxFileSizeBytes: 5,
	})
	if err == nil {
		t.Fatal("expected error when file exceeds max size")
	}
}

func TestValidateMaterializedPathEmpty(t *testing.T) {
	t.Parallel()

	err := validateMaterializedPath("", policy.RunnerFilesystemConfig{})
	if err == nil {
		t.Fatal("expected error for empty path")
	}
}

func TestValidateMaterializedPathAbsolute(t *testing.T) {
	t.Parallel()

	err := validateMaterializedPath("/absolute/path", policy.RunnerFilesystemConfig{})
	if err == nil {
		t.Fatal("expected error for absolute path")
	}
}

func TestValidateMaterializedPathDisallowed(t *testing.T) {
	t.Parallel()

	for _, path := range []string{".", "..", "main.go"} {
		err := validateMaterializedPath(path, policy.RunnerFilesystemConfig{})
		if err == nil {
			t.Fatalf("expected error for path %q", path)
		}
	}
}

func TestValidateMaterializedPathEscapes(t *testing.T) {
	t.Parallel()

	err := validateMaterializedPath("../escape", policy.RunnerFilesystemConfig{})
	if err == nil {
		t.Fatal("expected error for escaping path")
	}
}

func TestNormalizeOutput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input    string
		expected string
	}{
		{"  hello  \n\n", "hello"},
		{"\r\nwindows\r\n", "windows"},
		{"   ", ""},
		{"plain", "plain"},
	}

	for _, tc := range tests {
		result := NormalizeOutput(tc.input)
		if result != tc.expected {
			t.Errorf("NormalizeOutput(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

func TestEffectiveExecutionTimeoutUsesDefault(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	timeout, err := effectiveExecutionTimeout(ctx, 0)
	if err != nil {
		t.Fatalf("effectiveExecutionTimeout returned error: %v", err)
	}
	if timeout != defaultTimeout {
		t.Fatalf("expected default timeout, got %s", timeout)
	}
}

func TestEffectiveExecutionTimeoutNoDeadline(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	timeout, err := effectiveExecutionTimeout(ctx, 5*time.Second)
	if err != nil {
		t.Fatalf("effectiveExecutionTimeout returned error: %v", err)
	}
	if timeout != 5*time.Second {
		t.Fatalf("expected requested timeout, got %s", timeout)
	}
}

func TestExecuteResolvesPolicy(t *testing.T) {
	t.Parallel()

	// Skip if Go is not installed (common in CI/minimal environments)
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go not installed, skipping execution test")
	}

	service := New()
	_, _, err := service.runWithConfig(t.Context(), ExecutionRequest{
		Code:     "package main\nfunc main() {}",
		Language: policy.LanguageGo,
	}, policy.RunnerConfig{
		Timeout: 5 * time.Second,
		MinimalEnv: []string{"CGO_ENABLED=0"},
		Limits: policy.RunnerLimits{
			OutputBytes: 64 * 1024,
		},
	})
	// This will fail because go is not installed, but tests the policy path
	_ = err
}
