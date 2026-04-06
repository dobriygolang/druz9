package startroomhttp

import (
	"context"
	"encoding/json"
	"net/http"

	appcodeeditor "api/internal/app/codeeditor"
	"api/internal/model"
	realtimeschema "api/internal/realtime/schema"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

// RealtimePublisher broadcasts room updates to all connected WS clients.
type RealtimePublisher interface {
	PublishRoomUpdate(room *realtimeschema.CodeEditorRoom)
}

// Authorizer extracts and validates session tokens.
type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(srv *kratoshttp.Server, svc *appcodeeditor.Service, publisher RealtimePublisher, authorizer Authorizer) {
	router := srv.Route("/api/v1/code-editor")
	router.POST("/rooms/{room_id}/start", wrapHandler(handleStartRoom(svc, publisher, authorizer)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// ensure uuid is used (it's used in http.go via uuid.Parse / *uuid.UUID)
var _ = uuid.Nil
