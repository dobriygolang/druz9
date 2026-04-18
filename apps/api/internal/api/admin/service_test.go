package admin

import (
	"context"
	"errors"
	"slices"
	"strings"
	"testing"

	"api/internal/api/admin/mocks"
	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"
	commonv1 "api/pkg/api/common/v1"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

type fakeDockerLogsRunner struct {
	calls [][]string
	err   error
}

func (r *fakeDockerLogsRunner) Run(_ context.Context, _ []byte, args []string) ([]byte, error) {
	r.calls = append(r.calls, slices.Clone(args))
	if r.err != nil {
		return nil, r.err
	}
	if len(args) > 0 && args[0] == "ps" {
		return []byte("container123\n"), nil
	}
	return []byte("2026-04-18T10:00:00Z backend started\n"), nil
}

type stubConfigService struct {
	variables map[rtc.Key]rtc.Variable
	setErr    error
}

func (s *stubConfigService) GetValue(_ context.Context, key rtc.Key) rtc.Value {
	if s == nil {
		return rtc.Value{}
	}
	variable, ok := s.variables[key]
	if !ok {
		return rtc.Value{}
	}
	return variable.Value()
}

func (s *stubConfigService) SetValue(_ context.Context, key rtc.Key, value string) error {
	if s.setErr != nil {
		return s.setErr
	}
	variable, ok := s.variables[key]
	if !ok {
		return errors.New("config key not found")
	}
	variable.Definition.Value = value
	s.variables[key] = variable
	return nil
}

func (s *stubConfigService) ListVariables(_ context.Context) map[rtc.Key]rtc.Variable {
	if s == nil {
		return nil
	}
	result := make(map[rtc.Key]rtc.Variable, len(s.variables))
	for key, variable := range s.variables {
		result[key] = variable
	}
	return result
}

func TestDeleteUser(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		mockService := mocks.NewService(t)
		mockService.On("DeleteUser", context.Background(), userID).Return(nil).Once()

		impl := New(mockService, nil, nil, nil)
		req := &v1.DeleteUserRequest{UserId: userID.String()}

		resp, err := impl.DeleteUser(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Status != commonv1.OperationStatus_OPERATION_STATUS_OK {
			t.Errorf("expected status 'ok', got %s", resp.Status)
		}
	})

	t.Run("returns error for invalid user id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil, nil, nil, nil)
		req := &v1.DeleteUserRequest{UserId: "invalid-uuid"}

		_, err := impl.DeleteUser(context.Background(), req)
		if err == nil {
			t.Error("expected error for invalid user id")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("service error")
		mockService := mocks.NewService(t)
		userID := uuid.New()
		mockService.On("DeleteUser", context.Background(), userID).Return(expectedErr).Once()

		impl := New(mockService, nil, nil, nil)
		req := &v1.DeleteUserRequest{UserId: userID.String()}

		_, err := impl.DeleteUser(context.Background(), req)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestConfigMethods(t *testing.T) {
	t.Parallel()

	configService := &stubConfigService{
		variables: map[rtc.Key]rtc.Variable{
			rtc.Key("server_http_addr"): {
				Key: rtc.Key("server_http_addr"),
				Definition: rtc.Definition{
					Value:    ":8080",
					Type:     "string",
					Writable: true,
					Usage:    "HTTP server listen address",
					Group:    "server",
				},
			},
		},
	}

	impl := New(nil, configService, nil, nil)

	t.Run("get config", func(t *testing.T) {
		resp, err := impl.GetConfig(context.Background(), &v1.GetConfigRequest{Key: "server_http_addr"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.Value != ":8080" {
			t.Fatalf("expected :8080, got %s", resp.Value)
		}
	})

	t.Run("list config", func(t *testing.T) {
		resp, err := impl.ListConfig(context.Background(), &v1.ListConfigRequest{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(resp.Configs) != 1 {
			t.Fatalf("expected 1 config, got %d", len(resp.Configs))
		}
		if resp.Configs[0].Key != "server_http_addr" {
			t.Fatalf("unexpected key: %s", resp.Configs[0].Key)
		}
	})

	t.Run("update config", func(t *testing.T) {
		resp, err := impl.UpdateConfig(context.Background(), &v1.UpdateConfigRequest{
			Key:   "server_http_addr",
			Value: ":9090",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !resp.Success || resp.Value != ":9090" {
			t.Fatalf("unexpected response: %+v", resp)
		}
	})

	t.Run("missing config returns not found", func(t *testing.T) {
		_, err := impl.GetConfig(context.Background(), &v1.GetConfigRequest{Key: "missing"})
		if err == nil {
			t.Fatal("expected error")
		}
		if kratoserrors.Reason(err) != "CONFIG_NOT_FOUND" {
			t.Fatalf("unexpected error reason: %s", kratoserrors.Reason(err))
		}
	})
}

func TestGetDockerLogs(t *testing.T) {
	t.Setenv("DOCKER_LOGS_PROJECT", "druz9")

	t.Run("returns logs for allowed service", func(t *testing.T) {
		runner := &fakeDockerLogsRunner{}
		impl := New(nil, nil, nil, nil)
		impl.dockerLogsRunner = runner

		resp, err := impl.GetDockerLogs(context.Background(), &DockerLogsRequest{
			Service: "backend",
			Tail:    100,
			Since:   "10m",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.ContainerID != "container123" {
			t.Fatalf("unexpected container id: %s", resp.ContainerID)
		}
		if resp.Tail != 100 {
			t.Fatalf("unexpected tail: %d", resp.Tail)
		}
		if !strings.Contains(resp.Logs, "backend started") {
			t.Fatalf("unexpected logs: %q", resp.Logs)
		}
		if len(runner.calls) != 2 {
			t.Fatalf("expected 2 docker calls, got %d", len(runner.calls))
		}
		if got := runner.calls[1]; !slices.Contains(got, "--since") || !slices.Contains(got, "10m") {
			t.Fatalf("expected docker logs call to include --since 10m, got %v", got)
		}
	})

	t.Run("rejects unknown service", func(t *testing.T) {
		impl := New(nil, nil, nil, nil)
		impl.dockerLogsRunner = &fakeDockerLogsRunner{}

		_, err := impl.GetDockerLogs(context.Background(), &DockerLogsRequest{Service: "unknown", Tail: 100})
		if err == nil {
			t.Fatal("expected error")
		}
		if kratoserrors.Reason(err) != "UNKNOWN_DOCKER_SERVICE" {
			t.Fatalf("unexpected error reason: %s", kratoserrors.Reason(err))
		}
	})

	t.Run("caps large tail", func(t *testing.T) {
		runner := &fakeDockerLogsRunner{}
		impl := New(nil, nil, nil, nil)
		impl.dockerLogsRunner = runner

		resp, err := impl.GetDockerLogs(context.Background(), &DockerLogsRequest{Service: "backend", Tail: 9000})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.Tail != maxDockerLogsTail {
			t.Fatalf("expected tail cap %d, got %d", maxDockerLogsTail, resp.Tail)
		}
	})
}
