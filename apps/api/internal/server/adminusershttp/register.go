package adminusershttp

import (
	"context"
	"net/http"

	"api/internal/model"

	"github.com/google/uuid"
)

const Prefix = "/api/admin/users/"

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

type Repo interface {
	UpdateUserTrusted(ctx context.Context, userID uuid.UUID, isTrusted bool) error
}

type CacheInvalidator interface {
	InvalidateProfileCache(userID uuid.UUID)
}

func Register(
	srv interface {
		HandlePrefix(prefix string, handler http.Handler)
	},
	repo Repo,
	authorizer Authorizer,
	cacheInvalidator CacheInvalidator,
) {
	srv.HandlePrefix(Prefix, Handler(repo, authorizer, cacheInvalidator))
}

func Handler(repo Repo, authorizer Authorizer, cacheInvalidator CacheInvalidator) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(Prefix, handleUsers(repo, authorizer, cacheInvalidator))
	return mux
}
