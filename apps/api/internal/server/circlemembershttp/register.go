package circlemembershttp

import (
	"context"
	"encoding/json"
	"net/http"

	"api/internal/model"
	circledomain "api/internal/domain/circle"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

// CircleService is the subset of the circle domain used by this handler.
type CircleService interface {
	ListCircleMembers(ctx context.Context, circleID uuid.UUID, limit int32) ([]*model.CircleMemberProfile, error)
}

// Authorizer extracts and validates session tokens.
type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(srv *kratoshttp.Server, svc *circledomain.Service, authorizer Authorizer) {
	router := srv.Route("/api/v1/circles")
	router.GET("/{circle_id}/members", wrapHandler(handleListCircleMembers(svc, authorizer)))
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
