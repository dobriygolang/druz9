package admin

import (
	"context"
	"errors"
	"testing"

	"api/internal/api/admin/mocks"
	v1 "api/pkg/api/admin/v1"

	"github.com/google/uuid"
)

func TestDeleteUser(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		mockService := mocks.NewService(t)
		mockService.On("DeleteUser", context.Background(), userID).Return(nil).Once()

		impl := New(mockService)
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

		impl := New(nil)
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

		impl := New(mockService)
		req := &v1.DeleteUserRequest{UserId: userID.String()}

		_, err := impl.DeleteUser(context.Background(), req)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}
