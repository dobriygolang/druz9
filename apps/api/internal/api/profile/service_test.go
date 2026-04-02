package profile

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/api/profile/mocks"
	profiledomain "api/internal/domain/profile"
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
			Token: "",
			Code:  "123456",
		}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, FirstName: "John"},
		}
		rawToken := "test-token"
		expiresAt := time.Now().Add(time.Hour)

		mockService := mocks.NewService(t)
		mockService.On("TelegramAuth", mock.Anything, "", "123456").Return(expectedResponse, rawToken, expiresAt, nil).Once()

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
		mockService.On("TelegramAuth", mock.Anything, "challenge-token", "").Return(nil, "", time.Time{}, expectedErr).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.TelegramAuth(context.Background(), &v1.TelegramAuthRequest{Token: "challenge-token"})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestCreateTelegramAuthChallenge(t *testing.T) {
	t.Parallel()

	mockService := mocks.NewService(t)
	mockService.On("CreateTelegramAuthChallenge", mock.Anything).Return(&model.TelegramAuthChallenge{
		Token:       "",
		BotStartURL: "https://t.me/druz9_bot",
		ExpiresAt:   time.Now().Add(time.Minute),
	}, nil).Once()

	impl := New(mockService, mocks.NewSessionCookieManager(t))

	resp, err := impl.CreateTelegramAuthChallenge(context.Background(), &v1.CreateTelegramAuthChallengeRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.BotStartUrl == "" || resp.ExpiresAt == nil {
		t.Fatalf("expected filled challenge response, got %+v", resp)
	}
}

func TestConfirmTelegramAuth(t *testing.T) {
	t.Parallel()

	mockService := mocks.NewService(t)
	mockService.On("ConfirmTelegramAuth", mock.Anything, "bot-secret", "challenge-token", model.TelegramAuthPayload{
		ID:        123,
		FirstName: "John",
		LastName:  "Doe",
		Username:  "johndoe",
		PhotoURL:  "https://example.com/avatar.jpg",
	}).Return("123456", nil).Once()

	impl := New(mockService, mocks.NewSessionCookieManager(t))

	resp, err := impl.ConfirmTelegramAuth(context.Background(), &v1.ConfirmTelegramAuthRequest{
		Token:      "challenge-token",
		BotToken:   "bot-secret",
		TelegramId: 123,
		FirstName:  "John",
		LastName:   "Doe",
		Username:   "johndoe",
		PhotoUrl:   "https://example.com/avatar.jpg",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "ok" {
		t.Fatalf("expected ok status, got %q", resp.Status)
	}
	if resp.Code != "123456" {
		t.Fatalf("expected code 123456, got %q", resp.Code)
	}
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
		mockService.On("GetAvatarURL", mock.Anything, "").Return("", nil).Once()

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

func TestUpdateLocation(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.UpdateLocationRequest{
			Region: "EU",
			City:   "Berlin",
		}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, Status: model.UserStatusActive},
		}

		mockService := mocks.NewService(t)
		mockService.On("UpdateLocation", mock.Anything, userID, model.CompleteRegistrationRequest{
			Region: "EU",
			City:   "Berlin",
		}).Return(expectedResponse, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		user := &model.User{ID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.UpdateLocation(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		mockService := mocks.NewService(t)
		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.UpdateLocation(context.Background(), &v1.UpdateLocationRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}

func TestGetPhotoUploadURL(t *testing.T) {
	t.Parallel()

	t.Run("gets photo upload URL", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.GetPhotoUploadURLRequest{
			ContentType: "image/jpeg",
			FileName:    "photo.jpg",
		}
		expectedTarget := &profiledomain.PhotoUploadTarget{
			UploadURL: "https://s3.example.com/upload/photo.jpg",
			ObjectKey: "photos/photo.jpg",
		}

		mockService := mocks.NewService(t)
		mockService.On("PreparePhotoUpload", mock.Anything, userID.String(), "photo.jpg", "image/jpeg").Return(expectedTarget, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		user := &model.User{ID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.GetPhotoUploadURL(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		mockService := mocks.NewService(t)
		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.GetPhotoUploadURL(context.Background(), &v1.GetPhotoUploadURLRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}

func TestCompletePhotoUpload(t *testing.T) {
	t.Parallel()

	t.Run("completes photo upload", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.CompletePhotoUploadRequest{
			ObjectKey: "photos/photo.jpg",
		}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, AvatarURL: "https://s3.example.com/files/photo.jpg"},
		}

		mockService := mocks.NewService(t)
		mockService.On("CompletePhotoUpload", mock.Anything, userID, "photos/photo.jpg").Return(expectedResponse, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		user := &model.User{ID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CompletePhotoUpload(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		mockService := mocks.NewService(t)
		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.CompletePhotoUpload(context.Background(), &v1.CompletePhotoUploadRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}

func TestBindTelegram(t *testing.T) {
	t.Parallel()

	t.Run("binds telegram successfully", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := &v1.BindTelegramRequest{
			Token: "challenge-token",
			Code:  "123456",
		}
		expectedResponse := &model.ProfileResponse{
			User: &model.User{ID: userID, Username: "sergey"},
		}

		mockService := mocks.NewService(t)
		mockService.On("BindTelegram", mock.Anything, userID, "challenge-token", "123456").Return(expectedResponse, nil).Once()

		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		user := &model.User{ID: userID}
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.BindTelegram(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		mockService := mocks.NewService(t)
		mockCookie := mocks.NewSessionCookieManager(t)

		impl := New(mockService, mockCookie)

		_, err := impl.BindTelegram(context.Background(), &v1.BindTelegramRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}
