package aireviewhttp

import (
	"context"
	"net/http"

	"api/internal/aireview"
	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(srv *kratoshttp.Server, reviewer aireview.Reviewer, authorizer Authorizer) {
	router := srv.Route("/api/v1/code-editor")
	router.POST("/ai-review", wrapHandler(handleAIReview(reviewer, authorizer)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}
