package admin

import (
	"context"
	"errors"
	"testing"

	"api/internal/domain/admin/mocks"
	"github.com/google/uuid"
)

func TestDeleteUser(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		mockRepo := mocks.NewProfileRepository(t)

		mockRepo.On("DeleteUser", context.Background(), userID).Return(nil).Once()

		svc := NewService(Config{
			ProfileRepository: mockRepo,
		})

		err := svc.DeleteUser(context.Background(), userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockRepo := mocks.NewProfileRepository(t)
		userID := uuid.New()

		mockRepo.On("DeleteUser", context.Background(), userID).Return(expectedErr).Once()

		svc := NewService(Config{
			ProfileRepository: mockRepo,
		})

		err := svc.DeleteUser(context.Background(), userID)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}
