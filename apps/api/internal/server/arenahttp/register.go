package arenahttp

import (
	"context"
	"net/http"

	"api/internal/model"
	"api/internal/realtime"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

const (
	QueueJoinPath      = "/api/v1/arena/queue/join"
	QueueLeavePath     = "/api/v1/arena/queue/leave"
	QueueStatusPath    = "/api/v1/arena/queue/status"
	AntiCheatEventPath = "/api/v1/arena/anti-cheat/event"
	StatsPrefix        = "/api/v1/arena/stats/"
	StatsBatchPath     = "/api/v1/arena/stats/batch"
	GuestIDHeader      = "X-Arena-Guest-Id"
	GuestNameHeader    = "X-Arena-Guest-Name"
	OpenMatchesPath    = "/api/v1/arena/open-matches"
	RealtimePrefix     = "/api/v1/arena/realtime/"
)

type QueueService interface {
	EnqueueMatchmaking(ctx context.Context, user *model.User, topic, difficulty string, obfuscateOpponent bool) (*model.ArenaQueueState, error)
	LeaveQueue(ctx context.Context, user *model.User) error
	GetQueueStatus(ctx context.Context, user *model.User) (*model.ArenaQueueState, error)
	GetPlayerStats(ctx context.Context, userID uuid.UUID) (*model.ArenaPlayerStats, error)
	GetPlayerStatsBatch(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*model.ArenaPlayerStats, error)
	ReportPlayerSuspicion(ctx context.Context, matchID uuid.UUID, user *model.User, reason string) error
}

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
	DevBypass() bool
	DevUserID() string
}

type OpenMatchesService interface {
	ListOpenMatches(ctx context.Context, limit int32) ([]*model.ArenaMatch, error)
}

func RegisterQueue(srv *kratoshttp.Server, service QueueService, authorizer Authorizer) {
	router := srv.Route("/api/v1/arena")
	router.POST("/queue/join", wrapHandler(handleQueueJoin(service, authorizer)))
	router.POST("/queue/leave", wrapHandler(handleQueueLeave(service, authorizer)))
	router.GET("/queue/status", wrapHandler(handleQueueStatus(service, authorizer)))
	router.GET("/stats/{user_id}", wrapHandler(handleStats(service)))
	router.POST("/stats/batch", wrapHandler(handleStatsBatch(service)))
	router.POST("/anti-cheat/event", wrapHandler(handleAntiCheatEvent(service, authorizer)))
}

func RegisterOpenMatches(srv *kratoshttp.Server, service OpenMatchesService) {
	srv.Route("/api/v1/arena").GET("/open-matches", wrapHandler(func(w http.ResponseWriter, r *http.Request) {
		handleOpenMatches(w, r, service)
	}))
}

func RegisterRealtime(srv *kratoshttp.Server, hub *realtime.ArenaHub) {
	srv.HandlePrefix(RealtimePrefix, RealtimeHandler(hub))
}

func RealtimeHandler(hub *realtime.ArenaHub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(RealtimePrefix, func(w http.ResponseWriter, r *http.Request) {
		matchID, ok := parseRealtimeMatchID(r)
		if !ok {
			http.NotFound(w, r)
			return
		}
		hub.Handler(matchID).ServeHTTP(w, r)
	})
	return mux
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}
