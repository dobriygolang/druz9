package adminusershttp

import (
	"context"
	"net/http"

	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

type Repo interface {
	UpdateUserTrusted(ctx context.Context, userID uuid.UUID, isTrusted bool) error
	UpdateUserAdmin(ctx context.Context, userID uuid.UUID, isAdmin bool) error
}

type CacheInvalidator interface {
	InvalidateProfileCache(userID uuid.UUID)
}

func Register(srv *kratoshttp.Server, repo Repo, authorizer Authorizer, cacheInvalidator CacheInvalidator) {
	router := srv.Route("/api/admin/users")
	router.PATCH("/{user_id}/trust", wrapHandler(handleUsers("trust", repo, authorizer, cacheInvalidator)))
	router.PATCH("/{user_id}/admin", wrapHandler(handleUsers("admin", repo, authorizer, cacheInvalidator)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}
