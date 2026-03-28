package profile

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/api/profile/mocks"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestTelegramAuth(t *testing.T) {
	t.Parallel()

	t.Run("authenticates and sets cookie", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.TelegramAuthRequest{
			Id:        123,
			FirstName: "John",
			LastName:  "Doe",
			Username:  "johndoe",
			AuthDate:  time.Now().Unix(),
			Hash:      "somehash",
		}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, FirstName: "John"},
		}
		rawToken := "test-token"
		expiresAt := time.Now().Add(time.Hour)

		mockService := mocks.NewService(t)
		mockService.On("TelegramAuth", mock.Anything, mock.Anything).Return(expectedResponse, rawToken, expiresAt, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)
		mockCookie.On("SetSessionCookie", mock.Anything, rawToken, expiresAt).Once()

		impl := New(mockService, mockCookie)

		resp, err := impl.TelegramAuth(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
		mockCookie.AssertExpectations(t)
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("auth failed")
		mockService := mocks.NewService(t)
		mockService.On("TelegramAuth", mock.Anything, mock.Anything).Return(nil, "", time.Time{}, expectedErr).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.TelegramAuth(context.Background(), &v1.TelegramAuthRequest{Id: 123})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestGetProfileByID(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, FirstName: "John"},
		}

		mockService := mocks.NewService(t)
		mockService.On("GetProfileByID", mock.Anything, userID).Return(expectedResponse, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)
		req := &v1.GetProfileByIDRequest{UserId: userID.String()}

		resp, err := impl.GetProfileByID(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})
}

func TestLogout(t *testing.T) {
	t.Parallel()

	t.Run("clears cookie and delegates to service", func(t *testing.T) {
		t.Parallel()

		tokenHash := "test-token-hash"
		userID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("Logout", mock.Anything, tokenHash).Return(nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)
		mockCookie.On("ClearSessionCookie", mock.Anything).Once()

		impl := New(mockService, mockCookie)

		// Create context with user and session
		user := &model.User{ID: userID}
		session := &model.Session{TokenHash: tokenHash, UserID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user, Session: session})

		_, err := impl.Logout(ctx, &v1.LogoutRequest{})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockService.AssertExpectations(t)
		mockCookie.AssertExpectations(t)
	})

	t.Run("returns error when no session in context", func(t *testing.T) {
		t.Parallel()

		mockService := mocks.NewService(t)
		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.Logout(context.Background(), &v1.LogoutRequest{})
		if err == nil {
			t.Error("expected error when no session in context")
		}
	})
}

func TestCompleteRegistration(t *testing.T) {
	t.Parallel()

	t.Run("completes registration and sets cookie", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.CompleteRegistrationRequest{
			Region: "EU",
			City:   "Berlin",
		}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, Status: model.UserStatusActive},
		}
		rawToken := "test-token"
		expiresAt := time.Now().Add(time.Hour)

		mockService := mocks.NewService(t)
		mockService.On("CompleteRegistration", mock.Anything, userID, mock.Anything).Return(expectedResponse, rawToken, expiresAt, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)
		mockCookie.On("SetSessionCookie", mock.Anything, rawToken, expiresAt).Once()

		impl := New(mockService, mockCookie)

		// Create context with user
		user := &model.User{ID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CompleteRegistration(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
		mockCookie.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.UpdateProfileRequest{CurrentWorkplace: "Test Corp"}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, CurrentWorkplace: "Test Corp"},
		}

		mockService := mocks.NewService(t)
		mockService.On("UpdateProfile", mock.Anything, mock.Anything, mock.Anything).Return(expectedResponse, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		// Create context with user
		user := &model.User{ID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.UpdateProfile(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})
}