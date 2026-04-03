package interviewprepcheckpointhttp

import (
	"context"
	"net/http"

	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(srv *kratoshttp.Server, service *appinterviewprep.Service, authorizer Authorizer) {
	router := srv.Route("/api/v1/interview-prep/checkpoints")
	router.POST("/start", wrapHandler(handleStartCheckpoint(service, authorizer)))
	router.GET("/session/{session_id}", wrapHandler(handleGetCheckpoint(service, authorizer)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}
