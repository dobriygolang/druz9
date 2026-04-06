package circleeventhttp

import (
	"context"
	"encoding/json"
	"net/http"

	"api/internal/model"
	circledomain "api/internal/domain/circle"
	eventdomain "api/internal/domain/event"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

// EventService is the event domain subset used by this handler.
type EventService interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error)
}

// CircleService provides circle membership checks.
type CircleService interface {
	IsMember(ctx context.Context, circleID, userID uuid.UUID) (bool, error)
}

// Authorizer extracts and validates session tokens.
type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(
	srv *kratoshttp.Server,
	eventSvc *eventdomain.Service,
	circleSvc *circledomain.Service,
	authorizer Authorizer,
) {
	router := srv.Route("/api/v1/circles")
	router.GET("/{circle_id}/events", wrapHandler(handleListCircleEvents(eventSvc, authorizer)))
	router.POST("/{circle_id}/events", wrapHandler(handleCreateCircleEvent(eventSvc, circleSvc, authorizer)))
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

var _ = uuid.Nil
