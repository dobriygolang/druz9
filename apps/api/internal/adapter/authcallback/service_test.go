package authcallback

import (
	"context"
	"errors"
	"testing"

	"api/internal/model"
	v1 "api/pkg/adapter/auth_callback/v1"
)

type fakeService struct {
	code    string
	err     error
	token   string
	bot     string
	payload model.TelegramAuthPayload
}

func (f *fakeService) ConfirmTelegramAuth(_ context.Context, botToken, challengeToken string, payload model.TelegramAuthPayload) (string, error) {
	f.bot = botToken
	f.token = challengeToken
	f.payload = payload
	return f.code, f.err
}

func TestConfirmTelegramAuth(t *testing.T) {
	t.Parallel()

	svc := &fakeService{code: "123456"}
	server := New(svc)

	resp, err := server.ConfirmTelegramAuth(context.Background(), &v1.ConfirmTelegramAuthRequest{
		Token:      "challenge-token",
		BotToken:   "bot-secret",
		TelegramId: 42,
		FirstName:  "Sergey",
		LastName:   "Dorofeev",
		Username:   "sedorofeevd",
		PhotoUrl:   "https://example.com/avatar.jpg",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.GetStatus() != v1.OperationStatus_OPERATION_STATUS_OK {
		t.Fatalf("unexpected status: %v", resp.GetStatus())
	}
	if resp.GetCode() != "123456" {
		t.Fatalf("unexpected code: %q", resp.GetCode())
	}
	if svc.bot != "bot-secret" || svc.token != "challenge-token" {
		t.Fatalf("unexpected request forwarding: bot=%q token=%q", svc.bot, svc.token)
	}
	if svc.payload.ID != 42 || svc.payload.Username != "sedorofeevd" {
		t.Fatalf("unexpected payload: %+v", svc.payload)
	}
}

func TestConfirmTelegramAuthError(t *testing.T) {
	t.Parallel()

	expectedErr := errors.New("boom")
	server := New(&fakeService{err: expectedErr})

	_, err := server.ConfirmTelegramAuth(context.Background(), &v1.ConfirmTelegramAuthRequest{})
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected %v, got %v", expectedErr, err)
	}
}
