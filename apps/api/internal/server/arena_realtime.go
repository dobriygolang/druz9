package server

import (
	"net/http"
	"strings"

	"api/internal/realtime"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const arenaRealtimePrefix = "/api/v1/arena/realtime/"

func RegisterArenaRealtime(srv *kratoshttp.Server, hub *realtime.ArenaHub) {
	srv.HandlePrefix(arenaRealtimePrefix, arenaRealtimeHandler(hub))
}

func arenaRealtimeHandler(hub *realtime.ArenaHub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(arenaRealtimePrefix, func(w http.ResponseWriter, r *http.Request) {
		matchID, ok := parseArenaRealtimeMatchID(r)
		if !ok {
			http.NotFound(w, r)
			return
		}
		hub.Handler(matchID).ServeHTTP(w, r)
	})
	return mux
}

func parseArenaRealtimeMatchID(r *http.Request) (string, bool) {
	if !strings.HasPrefix(r.URL.Path, arenaRealtimePrefix) {
		return "", false
	}

	matchID := strings.TrimPrefix(r.URL.Path, arenaRealtimePrefix)
	if matchID == "" || strings.Contains(matchID, "/") {
		return "", false
	}

	return matchID, true
}
