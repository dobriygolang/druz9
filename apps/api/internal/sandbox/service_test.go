package sandbox

import (
	"context"
	"strings"
	"testing"

	"api/internal/policy"
)

func TestBuildNetworkEnv_MockOnlySetsProxy(t *testing.T) {
	t.Parallel()

	env, proxy, err := buildNetworkEnv(context.Background(), policy.RunnerNetworkConfig{
		Enabled:       true,
		Mode:          policy.NetworkMockOnly,
		AllowedHosts:  []string{"mock.local"},
		MockEndpoints: []string{"http://mock.local"},
	})
	if err != nil {
		t.Fatalf("build network env: %v", err)
	}
	if proxy != nil {
		defer proxy.close()
	}

	joined := strings.Join(env, "\n")
	if !strings.Contains(joined, "HTTP_PROXY=http://127.0.0.1:") {
		t.Fatalf("expected HTTP proxy env, got %q", joined)
	}
	if !strings.Contains(joined, "HTTPS_PROXY=http://127.0.0.1:") {
		t.Fatalf("expected HTTPS proxy env, got %q", joined)
	}
}

func TestValidateExecutionRequest_BlocksGoNetworkImportsForPureProfile(t *testing.T) {
	t.Parallel()

	err := validateExecutionRequest(ExecutionRequest{
		Code:       "package main\nimport \"net/http\"\nfunc main() {}",
		Language:   policy.LanguageGo,
		RunnerMode: "program",
	}, policy.RunnerConfig{
		Profile: policy.ProfilePure,
		Network: policy.RunnerNetworkConfig{
			Enabled: false,
			Mode:    policy.NetworkDisabled,
		},
		Filesystem: policy.RunnerFilesystemConfig{
			Mode: policy.FilesystemNone,
		},
	})
	if err == nil {
		t.Fatalf("expected blocked import error")
	}
	if !strings.Contains(err.Error(), `import "net/http" is blocked`) {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestExecute_MockHTTPGetUsesSandboxProxy(t *testing.T) {
	t.Parallel()

	svc := New()
	result, err := svc.Execute(context.Background(), ExecutionRequest{
		Code: `package main

import (
	"io"
	"net/http"
)

func solve(input string) string {
	resp, err := http.Get("http://mock.local/users?id=42")
	if err != nil {
		return err.Error()
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err.Error()
	}
	return string(body)
}
`,
		Language:   policy.LanguageGo,
		RunnerMode: "function_io",
		Task: policy.TaskSpec{
			Type:         policy.TaskTypeAPIJSON,
			Profile:      policy.ProfileHTTPClient,
			Language:     policy.LanguageGo,
			AllowedHosts: []string{"mock.local"},
			MockEndpoints: []string{
				"http://mock.local",
			},
			Capabilities: policy.TaskCapabilities{
				NeedsStdin:   true,
				NeedsNetwork: true,
				NeedsHTTP:    true,
			},
		},
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}

	if !strings.Contains(result.Output, `"mock":true`) {
		t.Fatalf("expected mock response, got %q", result.Output)
	}
	if !strings.Contains(result.Output, `"url":"http://mock.local/users?id=42"`) {
		t.Fatalf("expected mocked url in response, got %q", result.Output)
	}
}
