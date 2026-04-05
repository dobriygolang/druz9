package dailychallengehttp

import (
	"net/http"

	appcodeeditor "api/internal/app/codeeditor"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

func Register(srv *kratoshttp.Server, codeEditorService *appcodeeditor.Service) {
	router := srv.Route("/api/v1/code-editor")
	router.GET("/daily", wrapHandler(handleDailyChallenge(codeEditorService)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}
