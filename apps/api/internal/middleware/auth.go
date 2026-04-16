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

// tryDevBypass attempts dev bypass authentication. Returns the enriched context
// and true if bypass was applied, or the original context and false otherwise.
func tryDevBypass(ctx context.Context, authorizer ProfileAuthorizer) (context.Context, bool) {
	if !authorizer.DevBypass() {
		return ctx, false
	}
	devUserID := authorizer.DevUserID()
	if devUserID == "" {
		return ctx, true
	}
	userID, err := uuid.Parse(devUserID)
	if err != nil {
		return ctx, true
	}
	user, findErr := authorizer.FindUserByID(ctx, userID)
	if findErr != nil || user == nil {
		return ctx, true
	}
	authorizer.SetUserActivity(userID, time.Now().UTC())
	ctx = model.ContextWithAuth(ctx, &model.AuthState{User: user})
	return ctx, true
}

// authenticateFromToken extracts and validates a session token from the request transport.
// On success, returns the enriched context. On failure, returns an error.
// If extendSession is true and the session was extended, updates the cookie.
func authenticateFromToken(ctx context.Context, authorizer ProfileAuthorizer, cookies SessionCookieManager) (context.Context, error) {
	tr, ok := transport.FromServerContext(ctx)
	if !ok {
		return ctx, errors.Unauthorized("UNAUTHORIZED", "no transport")
	}

	rawToken, err := extractSessionToken(tr, authorizer.CookieName())
	if err != nil {
		return ctx, err
	}

	authState, err := authorizer.AuthenticateByToken(ctx, rawToken)
	if err != nil {
		if stdErrors.Is(err, profileerrors.ErrUnauthorized) {
			cookies.ClearSessionCookie(ctx)
			return ctx, profileerrors.ErrUnauthorized
		}
		return ctx, errors.InternalServer("INTERNAL", "internal server error")
	}

	if authState.SessionExtended {
		cookies.SetSessionCookie(ctx, authState.RawToken, authState.Session.ExpiresAt)
	}

	authorizer.SetUserActivity(authState.User.ID, time.Now().UTC())
	ctx = model.ContextWithAuth(ctx, authState)
	return ctx, nil
}

func RequireAuth(authorizer ProfileAuthorizer, cookies SessionCookieManager, shouldRequireAuth func() bool) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
			if shouldRequireAuth != nil && !shouldRequireAuth() {
				return handler(ctx, req)
			}

			if enriched, bypassed := tryDevBypass(ctx, authorizer); bypassed {
				return handler(enriched, req)
			}

			enriched, err := authenticateFromToken(ctx, authorizer, cookies)
			if err != nil {
				if stdErrors.Is(err, profileerrors.ErrUnauthorized) {
					return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
				}
				return nil, err
			}
			return handler(enriched, req)
		}
	}
}

func OptionalAuth(authorizer ProfileAuthorizer, cookies SessionCookieManager) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
			if hasExplicitGuestOverride(ctx) {
				return handler(ctx, req)
			}

			if enriched, bypassed := tryDevBypass(ctx, authorizer); bypassed {
				return handler(enriched, req)
			}

			enriched, err := authenticateFromToken(ctx, authorizer, cookies)
			if err != nil {
				// Optional auth: proceed unauthenticated on any error.
				return handler(ctx, req)
			}
			return handler(enriched, req)
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
