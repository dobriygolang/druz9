package server

import (
	"context"

	"api/internal/model"
	"api/internal/realtime"
	arenahttp "api/internal/server/arenahttp"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type arenaQueueService = arenahttp.QueueService
type arenaQueueAuthorizer = arenahttp.Authorizer

func RegisterArenaQueue(srv *kratoshttp.Server, service arenaQueueService, authorizer arenaQueueAuthorizer) {
	arenahttp.RegisterQueue(srv, service, authorizer)
}

func RegisterArenaOpenMatches(srv *kratoshttp.Server, service interface {
	ListOpenMatches(ctx context.Context, limit int32) ([]*model.ArenaMatch, error)
}) {
	arenahttp.RegisterOpenMatches(srv, service)
}

func RegisterArenaRealtime(srv *kratoshttp.Server, hub *realtime.ArenaHub) {
	arenahttp.RegisterRealtime(srv, hub)
}
