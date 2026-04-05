package activityhttp

import (
	"context"
	"net/http"

	profiledata "api/internal/data/profile"
	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(srv *kratoshttp.Server, repo *profiledata.Repo, authorizer Authorizer) {
	router := srv.Route("/api/v1/profile")
	router.GET("/{user_id}/activity", wrapHandler(handleGetActivity(repo, authorizer)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}
