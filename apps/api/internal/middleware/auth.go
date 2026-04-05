package middleware

import (
	"context"
	stdErrors "errors"
	"net/http"
	"strings"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/transport"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"

	"github.com/google/uuid"
)

const (
	codeEditorGuestNameHeader = "X-Code-Editor-Guest-Name"
	arenaGuestIDHeader        = "X-Arena-Guest-Id"
	arenaGuestNameHeader      = "X-Arena-Guest-Name"
)

type ProfileAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
	DevBypass() bool
	DevUserID() string
	FindUserByID(context.Context, uuid.UUID) (*model.User, error)
	SetUserActivity(userID uuid.UUID, at time.Time)
}

type SessionCookieManager interface {
	SetSessionCookie(context.Context, string, time.Time)
	ClearSessionCookie(context.Context)
}

func RequireAuth(authorizer ProfileAuthorizer, cookies SessionCookieManager, shouldRequireAuth func() bool) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
			if shouldRequireAuth != nil && !shouldRequireAuth() {
				return handler(ctx, req)
			}
			// DevBypass: use dev user in development
			if authorizer.DevBypass() {
				devUserID := authorizer.DevUserID()
				if devUserID != "" {
					userID, err := uuid.Parse(devUserID)
					if err == nil {
						user, findErr := authorizer.FindUserByID(ctx, userID)
						if findErr == nil && user != nil {
							// Update activity in cache
							authorizer.SetUserActivity(userID, time.Now().UTC())
							authState := &model.AuthState{User: user}
							ctx = model.ContextWithAuth(ctx, authState)
						}
					}
				}
				return handler(ctx, req)
			}

			if tr, ok := transport.FromServerContext(ctx); ok {
				rawToken, err := extractSessionToken(tr, authorizer.CookieName())
				if err != nil {
					return nil, errors.Unauthorized("UNAUTHORIZED", "missing session")
				}

				authState, err := authorizer.AuthenticateByToken(ctx, rawToken)
				if err != nil {
					if stdErrors.Is(err, profileerrors.ErrUnauthorized) {
						cookies.ClearSessionCookie(ctx)
						return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
					}
					return nil, errors.InternalServer("INTERNAL", "internal server error")
				}

				if authState.SessionExtended {
					cookies.SetSessionCookie(ctx, authState.RawToken, authState.Session.ExpiresAt)
				}

				// Update activity in cache
				authorizer.SetUserActivity(authState.User.ID, time.Now().UTC())

				ctx = model.ContextWithAuth(ctx, authState)
			}
			return handler(ctx, req)
		}
	}
}

func OptionalAuth(authorizer ProfileAuthorizer, cookies SessionCookieManager) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
			if hasExplicitGuestOverride(ctx) {
				return handler(ctx, req)
			}

			// DevBypass: use dev user in development.
			if authorizer.DevBypass() {
				devUserID := authorizer.DevUserID()
				if devUserID != "" {
					userID, err := uuid.Parse(devUserID)
					if err == nil {
						user, findErr := authorizer.FindUserByID(ctx, userID)
						if findErr == nil && user != nil {
							// Update activity in cache
							authorizer.SetUserActivity(userID, time.Now().UTC())
							authState := &model.AuthState{User: user}
							ctx = model.ContextWithAuth(ctx, authState)
						}
					}
				}
				return handler(ctx, req)
			}

			tr, ok := transport.FromServerContext(ctx)
			if !ok {
				return handler(ctx, req)
			}

			rawToken, err := extractSessionToken(tr, authorizer.CookieName())
			if err != nil {
				return handler(ctx, req)
			}

			authState, err := authorizer.AuthenticateByToken(ctx, rawToken)
			if err != nil {
				if stdErrors.Is(err, profileerrors.ErrUnauthorized) {
					cookies.ClearSessionCookie(ctx)
					return handler(ctx, req)
				}
				return nil, errors.InternalServer("INTERNAL", "internal server error")
			}

			if authState.SessionExtended {
				cookies.SetSessionCookie(ctx, authState.RawToken, authState.Session.ExpiresAt)
			}

			// Update activity in cache
			authorizer.SetUserActivity(authState.User.ID, time.Now().UTC())

			ctx = model.ContextWithAuth(ctx, authState)
			return handler(ctx, req)
		}
	}
}

func RequireAdmin() middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
			user, ok := model.UserFromContext(ctx)
			if !ok {
				return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
			}
			if !user.IsAdmin {
				return nil, errors.Forbidden("FORBIDDEN", "admin access required")
			}
			return handler(ctx, req)
		}
	}
}

func extractSessionToken(tr transport.Transporter, cookieName string) (string, error) {
	if ht, ok := tr.(*kratoshttp.Transport); ok {
		if ht.Request() != nil {
			cookie, err := ht.Request().Cookie(cookieName)
			if err == nil && strings.TrimSpace(cookie.Value) != "" {
				return cookie.Value, nil
			}
			if token := bearerTokenFromHeader(ht.Request().Header.Get("Authorization")); token != "" {
				return token, nil
			}
		}
		return "", http.ErrNoCookie
	}

	if gt, ok := tr.(*kratosgrpc.Transport); ok {
		header := gt.RequestHeader().Get("Cookie")
		if header == "" {
			header = gt.RequestHeader().Get("cookie")
		}
		req := http.Request{Header: http.Header{"Cookie": []string{header}}}
		cookie, err := req.Cookie(cookieName)
		if err == nil && strings.TrimSpace(cookie.Value) != "" {
			return cookie.Value, nil
		}
		if token := bearerTokenFromHeader(gt.RequestHeader().Get("Authorization")); token != "" {
			return token, nil
		}
		return "", http.ErrNoCookie
	}

	return "", http.ErrNoCookie
}

func bearerTokenFromHeader(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	const prefix = "bearer "
	if len(value) < len(prefix) || strings.ToLower(value[:len(prefix)]) != prefix {
		return ""
	}
	return strings.TrimSpace(value[len(prefix):])
}

func hasExplicitGuestOverride(ctx context.Context) bool {
	tr, ok := transport.FromServerContext(ctx)
	if !ok {
		return false
	}

	ht, ok := tr.(*kratoshttp.Transport)
	if !ok || ht.Request() == nil {
		return false
	}

	headers := ht.Request().Header
	return strings.TrimSpace(headers.Get(codeEditorGuestNameHeader)) != "" ||
		strings.TrimSpace(headers.Get(arenaGuestIDHeader)) != "" ||
		strings.TrimSpace(headers.Get(arenaGuestNameHeader)) != ""
}
