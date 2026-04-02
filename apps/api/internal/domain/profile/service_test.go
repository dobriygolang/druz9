package profile

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/domain/profile/mocks"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

const testSessionHash = "test-hash"

func TestGetProfileByID(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		expectedUser := &model.User{ID: userID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("FindUserByID", context.Background(), userID).Return(expectedUser, nil).Once()

		svc := NewProfileService(Config{
			Repository: mockRepo,
			Settings:   Settings{},
		})

		profile, err := svc.GetProfileByID(context.Background(), userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if profile.User.ID != userID {
			t.Errorf("expected userID %s, got %s", userID, profile.User.ID)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("not found")
		mockRepo := mocks.NewRepository(t)
		userID := uuid.New()

		mockRepo.On("FindUserByID", context.Background(), userID).Return(nil, expectedErr).Once()

		svc := NewProfileService(Config{
			Repository: mockRepo,
			Settings:   Settings{},
		})

		_, err := svc.GetProfileByID(context.Background(), userID)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		name := "John Doe"
		expectedUser := &model.User{ID: userID, FirstName: "John", LastName: "Doe"}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("UpdateProfile", context.Background(), userID, name).Return(expectedUser, nil).Once()

		svc := NewProfileService(Config{
			Repository: mockRepo,
			Settings:   Settings{},
		})

		profile, err := svc.UpdateProfile(context.Background(), userID, name)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if profile.User.FirstName != "John" {
			t.Errorf("expected first name John, got %s", profile.User.FirstName)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestCreateSession(t *testing.T) {
	t.Parallel()

	t.Run("delegates to session storage", func(t *testing.T) {
		t.Parallel()

		session := &model.Session{ID: uuid.New(), UserID: uuid.New()}

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("CreateSession", context.Background(), session).Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		err := svc.CreateSession(context.Background(), session)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockSessionStorage.AssertExpectations(t)
	})

	t.Run("propagates storage error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("storage error")
		mockSessionStorage := mocks.NewSessionStorage(t)
		session := &model.Session{ID: uuid.New()}

		mockSessionStorage.On("CreateSession", context.Background(), session).Return(expectedErr).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		err := svc.CreateSession(context.Background(), session)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockSessionStorage.AssertExpectations(t)
	})
}

func TestDeleteSessionByHash(t *testing.T) {
	t.Parallel()

	t.Run("delegates to session storage", func(t *testing.T) {
		t.Parallel()

		hash := testSessionHash

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("DeleteSessionByHash", context.Background(), hash).Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		err := svc.DeleteSessionByHash(context.Background(), hash)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockSessionStorage.AssertExpectations(t)
	})
}

func TestFindSessionByHash(t *testing.T) {
	t.Parallel()

	t.Run("delegates to session storage", func(t *testing.T) {
		t.Parallel()

		hash := testSessionHash
		expectedUser := &model.User{ID: uuid.New()}
		expectedAuthState := &model.AuthState{User: expectedUser}

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("FindSessionByHash", context.Background(), hash).Return(expectedAuthState, nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		authState, err := svc.FindSessionByHash(context.Background(), hash)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if authState.User.ID != expectedUser.ID {
			t.Errorf("expected userID %s, got %s", expectedUser.ID, authState.User.ID)
		}

		mockSessionStorage.AssertExpectations(t)
	})
}

func TestLogout(t *testing.T) {
	t.Parallel()

	t.Run("delegates to session storage", func(t *testing.T) {
		t.Parallel()

		hash := testSessionHash

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("DeleteSessionByHash", context.Background(), hash).Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		err := svc.Logout(context.Background(), hash)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockSessionStorage.AssertExpectations(t)
	})
}

func TestShouldRefresh(t *testing.T) {
	t.Parallel()

	t.Run("returns true when last seen is old", func(t *testing.T) {
		t.Parallel()

		refreshAfter := 30 * time.Minute
		lastSeenAt := time.Now().Add(-refreshAfter - 1*time.Minute)

		svc := NewProfileService(Config{
			Settings: Settings{
				SessionRefreshAfter: refreshAfter,
			},
		})

		if !svc.ShouldRefresh(lastSeenAt) {
			t.Error("expected ShouldRefresh to return true for old session")
		}
	})

	t.Run("returns false when last seen is recent", func(t *testing.T) {
		t.Parallel()

		refreshAfter := 30 * time.Minute
		lastSeenAt := time.Now().Add(-refreshAfter + 5*time.Minute)

		svc := NewProfileService(Config{
			Settings: Settings{
				SessionRefreshAfter: refreshAfter,
			},
		})

		if svc.ShouldRefresh(lastSeenAt) {
			t.Error("expected ShouldRefresh to return false for recent session")
		}
	})
}

func TestCookieName(t *testing.T) {
	t.Parallel()

	t.Run("returns configured cookie name", func(t *testing.T) {
		t.Parallel()

		expectedName := "session_cookie"
		svc := NewProfileService(Config{
			Settings: Settings{
				CookieName: expectedName,
			},
		})

		if svc.CookieName() != expectedName {
			t.Errorf("expected cookie name %s, got %s", expectedName, svc.CookieName())
		}
	})
}

func TestDevBypass(t *testing.T) {
	t.Parallel()

	t.Run("returns configured dev bypass", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{
			Settings: Settings{
				DevBypass: true,
			},
		})

		if !svc.DevBypass() {
			t.Error("expected DevBypass to return true")
		}
	})
}

func TestTelegramAuthChallenge(t *testing.T) {
	t.Parallel()

	t.Run("creates challenge with start url", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{
			Settings: Settings{
				BotUsername:        "druz9_bot",
				TelegramAuthMaxAge: 5 * time.Minute,
			},
		})

		challenge, err := svc.CreateTelegramAuthChallenge(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if challenge.BotStartURL == "" {
			t.Fatal("expected start url to be set")
		}
		if challenge.ExpiresAt.IsZero() {
			t.Fatal("expected expiresAt to be set")
		}
	})

	t.Run("confirms challenge with matching bot secret", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{
			Settings: Settings{
				BotToken:           "bot-secret",
				TelegramAuthMaxAge: 5 * time.Minute,
			},
		})

		code, err := svc.ConfirmTelegramAuth(context.Background(), "bot-secret", "", model.TelegramAuthPayload{ID: 123})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(code) != telegramLoginCodeLength {
			t.Fatalf("expected %d-digit code, got %q", telegramLoginCodeLength, code)
		}
	})

	t.Run("rejects confirm with wrong bot secret", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{
			Settings: Settings{
				BotToken:           "bot-secret",
				TelegramAuthMaxAge: 5 * time.Minute,
			},
		})

		_, err := svc.ConfirmTelegramAuth(context.Background(), "wrong-secret", "", model.TelegramAuthPayload{ID: 123})
		if err == nil {
			t.Fatal("expected error for invalid bot secret")
		}
	})
}

func TestTelegramAuth(t *testing.T) {
	t.Parallel()

	t.Run("authenticates user and creates session", func(t *testing.T) {
		t.Parallel()

		payload := model.TelegramAuthPayload{ID: 123, FirstName: "John"}
		user := &model.User{ID: uuid.New(), Username: "sergey"}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("UpsertUserByIdentity", context.Background(), model.IdentityAuthPayload{
			Provider:       model.AuthProviderTelegram,
			ProviderUserID: "123",
			Username:       "",
			FirstName:      "John",
			LastName:       "",
			AvatarURL:      "",
		}).Return(user, nil).Once()

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("CreateSession", mock.Anything, mock.Anything).Return(nil).Once()

		svc := NewProfileService(Config{
			Repository:     mockRepo,
			SessionStorage: mockSessionStorage,
			Settings: Settings{
				SessionTTL:         time.Hour,
				TelegramAuthMaxAge: time.Minute,
			},
		})

		challenge, err := svc.CreateTelegramAuthChallenge(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		code, err := svc.ConfirmTelegramAuth(context.Background(), "", challenge.Token, payload)
		if err != nil {
			t.Fatalf("unexpected confirm error: %v", err)
		}
		if code == "" {
			t.Fatal("expected website code")
		}

		profile, token, expiresAt, err := svc.TelegramAuth(context.Background(), "", code)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if profile == nil {
			t.Fatal("expected profile, got nil")
		}
		if token == "" {
			t.Error("expected token, got empty string")
		}
		if expiresAt.IsZero() {
			t.Error("expected expiresAt, got zero time")
		}

		mockRepo.AssertExpectations(t)
		mockSessionStorage.AssertExpectations(t)
	})

	t.Run("returns error when challenge was not confirmed", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{Settings: Settings{TelegramAuthMaxAge: time.Minute}})

		challenge, err := svc.CreateTelegramAuthChallenge(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		_, _, _, err = svc.TelegramAuth(context.Background(), challenge.Token, "")
		if err == nil {
			t.Error("expected error for unconfirmed challenge")
		}
	})

	t.Run("returns error when upsert fails", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockRepo := mocks.NewRepository(t)
		mockRepo.On("UpsertUserByIdentity", context.Background(), model.IdentityAuthPayload{
			Provider:       model.AuthProviderTelegram,
			ProviderUserID: "123",
			Username:       "",
			FirstName:      "",
			LastName:       "",
			AvatarURL:      "",
		}).Return(nil, expectedErr).Once()

		svc := NewProfileService(Config{
			Repository: mockRepo,
			Settings: Settings{
				TelegramAuthMaxAge: time.Minute,
			},
		})

		code, err := svc.ConfirmTelegramAuth(context.Background(), "", "", model.TelegramAuthPayload{ID: 123})
		if err != nil {
			t.Fatalf("unexpected confirm error: %v", err)
		}
		if code == "" {
			t.Fatal("expected website code")
		}

		_, _, _, err = svc.TelegramAuth(context.Background(), "", code)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestAuthenticateByToken(t *testing.T) {
	t.Parallel()

	t.Run("returns error for empty token", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{
			Settings: Settings{},
		})

		_, err := svc.AuthenticateByToken(context.Background(), "")
		if err == nil {
			t.Error("expected error for empty token")
		}
	})

	t.Run("returns error for whitespace token", func(t *testing.T) {
		t.Parallel()

		svc := NewProfileService(Config{
			Settings: Settings{},
		})

		_, err := svc.AuthenticateByToken(context.Background(), "   ")
		if err == nil {
			t.Error("expected error for whitespace token")
		}
	})

	t.Run("authenticates valid token and refreshes session", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		sessionID := uuid.New()
		rawToken := "valid-token"
		tokenHash := "hashed-token"
		now := time.Now()

		authState := &model.AuthState{
			User: &model.User{ID: userID},
			Session: &model.Session{
				ID:         sessionID,
				UserID:     userID,
				TokenHash:  tokenHash,
				LastSeenAt: now.Add(-1 * time.Hour),
				ExpiresAt:  now.Add(time.Hour),
			},
		}

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("FindSessionByHash", context.Background(), mock.AnythingOfType("string")).Return(authState, nil).Once()
		mockSessionStorage.On("TouchSession", context.Background(), userID, sessionID, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings: Settings{
				SessionTTL:          time.Hour,
				SessionRefreshAfter: 30 * time.Minute,
			},
		})

		result, err := svc.AuthenticateByToken(context.Background(), rawToken)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if result.User.ID != userID {
			t.Errorf("expected userID %s, got %s", userID, result.User.ID)
		}

		mockSessionStorage.AssertExpectations(t)
	})

	t.Run("returns error for expired session", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		now := time.Now()

		authState := &model.AuthState{
			User: &model.User{ID: userID},
			Session: &model.Session{
				ID:         uuid.New(),
				UserID:     userID,
				TokenHash:  "hashed-token",
				LastSeenAt: now.Add(-2 * time.Hour),
				ExpiresAt:  now.Add(-1 * time.Hour),
			},
		}

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("FindSessionByHash", context.Background(), mock.AnythingOfType("string")).Return(authState, nil).Once()
		mockSessionStorage.On("DeleteSessionByHash", context.Background(), "hashed-token").Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		_, err := svc.AuthenticateByToken(context.Background(), "expired-token")
		if err == nil {
			t.Error("expected error for expired session")
		}

		mockSessionStorage.AssertExpectations(t)
	})
}

func TestCompleteRegistration(t *testing.T) {
	t.Parallel()

	t.Run("completes registration and creates session", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		req := model.CompleteRegistrationRequest{Region: "EU", City: "Berlin"}
		user := &model.User{ID: userID, Status: model.UserStatusActive}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("CompleteRegistration", context.Background(), userID, req).Return(user, nil).Once()

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("CreateSession", mock.Anything, mock.Anything).Return(nil).Once()

		svc := NewProfileService(Config{
			Repository:     mockRepo,
			SessionStorage: mockSessionStorage,
			Settings: Settings{
				SessionTTL: time.Hour,
			},
		})

		profile, token, _, err := svc.CompleteRegistration(context.Background(), userID, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if profile == nil {
			t.Fatal("expected profile, got nil")
		}
		if token == "" {
			t.Error("expected token, got empty string")
		}
		if profile.NeedsProfileComplete {
			t.Errorf("expected NeedsProfileComplete to be false, got %v", profile.NeedsProfileComplete)
		}

		mockRepo.AssertExpectations(t)
		mockSessionStorage.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockRepo := mocks.NewRepository(t)
		mockRepo.On("CompleteRegistration", context.Background(), mock.AnythingOfType("uuid.UUID"), mock.AnythingOfType("model.CompleteRegistrationRequest")).Return(nil, expectedErr).Once()

		svc := NewProfileService(Config{
			Repository: mockRepo,
			Settings:   Settings{},
		})

		_, _, _, err := svc.CompleteRegistration(context.Background(), uuid.New(), model.CompleteRegistrationRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestNewSession(t *testing.T) {
	t.Parallel()

	t.Run("creates new session", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("CreateSession", mock.Anything, mock.Anything).Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings: Settings{
				SessionTTL: time.Hour,
			},
		})

		rawToken, session, err := svc.NewSession(context.Background(), userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if rawToken == "" {
			t.Error("expected raw token, got empty string")
		}
		if session == nil {
			t.Fatal("expected session, got nil")
		}
		if session.UserID != userID {
			t.Errorf("expected userID %s, got %s", userID, session.UserID)
		}
		if session.ExpiresAt.IsZero() {
			t.Error("expected expiresAt to be set")
		}

		mockSessionStorage.AssertExpectations(t)
	})

	t.Run("propagates storage error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("storage error")
		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("CreateSession", mock.Anything, mock.Anything).Return(expectedErr).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings:       Settings{},
		})

		_, _, err := svc.NewSession(context.Background(), uuid.New())
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestRotateSession(t *testing.T) {
	t.Parallel()

	t.Run("rotates existing session", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		oldHash := "old-hash"

		mockSessionStorage := mocks.NewSessionStorage(t)
		mockSessionStorage.On("ReplaceSession", context.Background(), oldHash, mock.Anything, mock.Anything).Return(nil).Once()

		svc := NewProfileService(Config{
			SessionStorage: mockSessionStorage,
			Settings: Settings{
				SessionTTL: time.Hour,
			},
		})

		rawToken, session, err := svc.RotateSession(context.Background(), oldHash, userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if rawToken == "" {
			t.Error("expected new raw token, got empty string")
		}
		if session.TokenHash == oldHash {
			t.Error("expected new token hash, got old one")
		}

		mockSessionStorage.AssertExpectations(t)
	})
}
