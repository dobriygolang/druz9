package code_editor

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"api/internal/model"
)

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
	if username := strings.TrimSpace(user.Username); username != "" {
		return username
	}
	return "User"
}
