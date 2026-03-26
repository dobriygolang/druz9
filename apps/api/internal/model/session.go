package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	TokenHash  string
	LastSeenAt time.Time
	ExpiresAt  time.Time
}

type AuthState struct {
	User            *User
	Session         *Session
	RawToken        string
	SessionExtended bool
}

type contextKey string

const (
	authUserContextKey    contextKey = "auth_user"
	authSessionContextKey contextKey = "auth_session"
)

func ContextWithAuth(ctx context.Context, state *AuthState) context.Context {
	ctx = context.WithValue(ctx, authUserContextKey, state.User)
	ctx = context.WithValue(ctx, authSessionContextKey, state.Session)
	return ctx
}

func UserFromContext(ctx context.Context) (*User, bool) {
	user, ok := ctx.Value(authUserContextKey).(*User)
	return user, ok
}

func SessionFromContext(ctx context.Context) (*Session, bool) {
	session, ok := ctx.Value(authSessionContextKey).(*Session)
	return session, ok
}
