package sandboxrunner

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"api/internal/policy"
	"api/internal/sandbox"
)

type fakeDockerRunner struct {
	args   []string
	stdin  []byte
	output []byte
	err    error
}

func (f *fakeDockerRunner) Run(_ context.Context, stdin []byte, args []string) ([]byte, error) {
	f.stdin = append([]byte(nil), stdin...)
	f.args = append([]string(nil), args...)
	return append([]byte(nil), f.output...), f.err
}

func TestServiceBuildsIsolatedDockerCommand(t *testing.T) {
	t.Parallel()

	fake := &fakeDockerRunner{
		output: mustJSON(t, sandbox.ExecuteResponseEnvelope{
			Result: &sandbox.ExecutionResult{Output: "ok"},
		}),
	}
	svc := NewService(Config{
		ExecImage: "druz9-sandbox-runner:local",
	})
	svc.docker = fake

	_, err := svc.Execute(context.Background(), sandbox.ExecutionRequest{
		Code:       "package main\nfunc main() {}",
		Language:   policy.LanguageGo,
		RunnerMode: "program",
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}

	command := strings.Join(fake.args, " ")
	for _, expected := range []string{
		"--network none",
		"--read-only",
		"--cap-drop ALL",
		"--security-opt no-new-privileges=true",
		"--pids-limit 64",
		"--tmpfs /tmp:rw,exec,nosuid,size=64m",
		"/app/bin/sandbox-exec",
	} {
		if !strings.Contains(command, expected) {
			t.Fatalf("expected docker args to contain %q, got %q", expected, command)
		}
	}
}

func TestServiceReturnsExecutorError(t *testing.T) {
	t.Parallel()

	fake := &fakeDockerRunner{
		output: mustJSON(t, sandbox.ExecuteResponseEnvelope{
			Error: "blocked",
		}),
	}
	svc := NewService(Config{ExecImage: "druz9-sandbox-runner:local"})
	svc.docker = fake

	_, err := svc.Execute(context.Background(), sandbox.ExecutionRequest{})
	if err == nil || !strings.Contains(err.Error(), "blocked") {
		t.Fatalf("expected executor error, got %v", err)
	}
}

func mustJSON(t *testing.T, value any) []byte {
	t.Helper()
	payload, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return payload
}
