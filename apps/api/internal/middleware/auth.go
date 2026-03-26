package middleware

import (
	"context"
	stdErrors "errors"
	"net/http"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/transport"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type ProfileAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

type SessionCookieManager interface {
	SetSessionCookie(context.Context, string, time.Time)
	ClearSessionCookie(context.Context)
}

func RequireAuth(authorizer ProfileAuthorizer, cookies SessionCookieManager) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
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

				ctx = model.ContextWithAuth(ctx, authState)
			}
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
		cookie, err := ht.Request().Cookie(cookieName)
		if err != nil {
			return "", err
		}
		return cookie.Value, nil
	}

	if gt, ok := tr.(*kratosgrpc.Transport); ok {
		header := gt.RequestHeader().Get("Cookie")
		if header == "" {
			header = gt.RequestHeader().Get("cookie")
		}
		req := http.Request{Header: http.Header{"Cookie": []string{header}}}
		cookie, err := req.Cookie(cookieName)
		if err != nil {
			return "", err
		}
		return cookie.Value, nil
	}

	return "", http.ErrNoCookie
}
