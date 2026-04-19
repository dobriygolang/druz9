package middleware

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"api/internal/model"
)

func TestRequireAdmin_WithAdminUser(t *testing.T) {
	t.Parallel()

	// Create admin user
	userID := uuid.New()
	user := &model.User{
		ID:      userID,
		IsAdmin: true,
	}
	ctx := model.ContextWithAuth(t.Context(), &model.AuthState{User: user})

	middleware := RequireAdmin()
	handler := middleware(func(ctx context.Context, req interface{}) (interface{}, error) {
		return "success", nil
	})

	result, err := handler(ctx, nil)
	require.NoError(t, err)
	assert.Equal(t, "success", result)
}

func TestRequireAdmin_WithNonAdminUser(t *testing.T) {
	t.Parallel()

	// Create non-admin user
	userID := uuid.New()
	user := &model.User{
		ID:      userID,
		IsAdmin: false,
	}
	ctx := model.ContextWithAuth(t.Context(), &model.AuthState{User: user})

	middleware := RequireAdmin()
	handler := middleware(func(ctx context.Context, req interface{}) (interface{}, error) {
		return "success", nil
	})

	_, err := handler(ctx, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "FORBIDDEN")
}

func TestRequireAdmin_WithoutUser(t *testing.T) {
	t.Parallel()

	ctx := t.Context()

	middleware := RequireAdmin()
	handler := middleware(func(ctx context.Context, req interface{}) (interface{}, error) {
		return "success", nil
	})

	_, err := handler(ctx, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "UNAUTHORIZED")
}

func TestHasExplicitGuestOverride_WithoutHeaders(t *testing.T) {
	t.Parallel()

	// Test without transport context
	ctx := t.Context()
	result := hasExplicitGuestOverride(ctx)
	assert.False(t, result)
}
