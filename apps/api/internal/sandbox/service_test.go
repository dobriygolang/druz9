package sandbox

import (
	"context"
	"os"
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
