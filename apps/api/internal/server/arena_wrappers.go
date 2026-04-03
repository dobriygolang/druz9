package server

import (
	"api/internal/realtime"
	arenahttp "api/internal/server/arenahttp"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

func RegisterArenaRealtime(srv *kratoshttp.Server, hub *realtime.ArenaHub) {
	arenahttp.RegisterRealtime(srv, hub)
}
