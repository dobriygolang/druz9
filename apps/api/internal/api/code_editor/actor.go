package code_editor

import (
	"context"
	"strings"

	"api/internal/model"

	"github.com/go-kratos/kratos/v2/transport"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

const codeEditorGuestNameHeader = "X-Code-Editor-Guest-Name"

func resolveActor(ctx context.Context, fallbackName string) (*uuid.UUID, string, bool) {
	user, ok := model.UserFromContext(ctx)
	if ok && user != nil {
		userID := user.ID
		return &userID, resolveUserDisplayName(user), false
	}

	name := strings.TrimSpace(fallbackName)
	if name == "" {
		name = codeEditorGuestName(ctx)
	}
	if name == "" {
		name = "Guest"
	}
	return nil, name, true
}

func resolveUserDisplayName(user *model.User) string {
	if user == nil {
		return "User"
	}

	fullName := strings.TrimSpace(strings.TrimSpace(user.FirstName) + " " + strings.TrimSpace(user.LastName))
	if fullName != "" {
		return fullName
	}
	if username := strings.TrimSpace(user.TelegramUsername); username != "" {
		return username
	}
	return "User"
}

func codeEditorGuestName(ctx context.Context) string {
	tr, ok := transport.FromServerContext(ctx)
	if !ok {
		return ""
	}

	httpTransport, ok := tr.(*kratoshttp.Transport)
	if !ok || httpTransport.Request() == nil {
		return ""
	}

	return strings.TrimSpace(httpTransport.Request().Header.Get(codeEditorGuestNameHeader))
}
