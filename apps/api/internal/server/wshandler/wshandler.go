// Package wshandler registers WebSocket (HTTP Upgrade) endpoints that cannot
// be expressed as proto HTTP annotations.
package wshandler

import (
	"net/http"
	"strings"

	"api/internal/realtime"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const (
	CodeEditorPrefix = "/api/v1/code-editor/realtime/"
	ArenaPrefix      = "/api/v1/arena/realtime/"
)

// Register mounts both WebSocket endpoints on the HTTP server.
func Register(srv *kratoshttp.Server, codeEditorHub *realtime.CodeEditorHub, arenaHub *realtime.ArenaHub) {
	srv.HandlePrefix(CodeEditorPrefix, codeEditorHandler(codeEditorHub))
	srv.HandlePrefix(ArenaPrefix, arenaHandler(arenaHub))
}

func codeEditorHandler(hub *realtime.CodeEditorHub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(CodeEditorPrefix, func(w http.ResponseWriter, r *http.Request) {
		roomID := extractID(r.URL.Path, CodeEditorPrefix)
		if roomID == "" {
			http.NotFound(w, r)
			return
		}
		hub.Handler(roomID).ServeHTTP(w, r)
	})
	return mux
}

func arenaHandler(hub *realtime.ArenaHub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(ArenaPrefix, func(w http.ResponseWriter, r *http.Request) {
		matchID := extractID(r.URL.Path, ArenaPrefix)
		if matchID == "" {
			http.NotFound(w, r)
			return
		}
		hub.Handler(matchID).ServeHTTP(w, r)
	})
	return mux
}

// extractID strips the prefix and returns the single path segment (no slashes).
func extractID(path, prefix string) string {
	id := strings.TrimPrefix(path, prefix)
	if id == "" || strings.ContainsRune(id, '/') {
		return ""
	}
	return id
}
