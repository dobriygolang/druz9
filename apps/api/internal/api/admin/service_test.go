package admin

import (
	"context"
	"errors"
	"testing"

	"api/internal/api/admin/mocks"
	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

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
		if resp.Status != "ok" {
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
