// Package wshandler registers WebSocket (HTTP Upgrade) endpoints that cannot
// be expressed as proto HTTP annotations.
package wshandler

import (
	"net/http"
	"strings"

	"api/internal/realtime"
	server "api/internal/server"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const (
	CodeEditorPrefix = "/api/v1/code-editor/realtime/"
	ArenaPrefix      = "/api/v1/arena/realtime/"
)

// Register mounts both WebSocket endpoints on the HTTP server.
func Register(srv *kratoshttp.Server, codeEditorHub *realtime.CodeEditorHub, arenaHub *realtime.ArenaHub, auth server.Authorizer) {
	srv.HandlePrefix(CodeEditorPrefix, codeEditorHandler(codeEditorHub, auth))
	srv.HandlePrefix(ArenaPrefix, arenaHandler(arenaHub, auth))
}

func codeEditorHandler(hub *realtime.CodeEditorHub, auth server.Authorizer) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(CodeEditorPrefix, func(w http.ResponseWriter, r *http.Request) {
		roomID := extractID(r.URL.Path, CodeEditorPrefix)
		if roomID == "" {
			http.NotFound(w, r)
			return
		}
		authenticatedUserID := ""
		if userID, ok := server.Authenticate(r, auth); ok && userID != nil {
			authenticatedUserID = userID.String()
		}
		hub.Handler(roomID, authenticatedUserID).ServeHTTP(w, r)
	})
	return mux
}

func arenaHandler(hub *realtime.ArenaHub, auth server.Authorizer) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(ArenaPrefix, func(w http.ResponseWriter, r *http.Request) {
		matchID := extractID(r.URL.Path, ArenaPrefix)
		if matchID == "" {
			http.NotFound(w, r)
			return
		}
		authenticatedUserID := ""
		if userID, ok := server.Authenticate(r, auth); ok && userID != nil {
			authenticatedUserID = userID.String()
		}
		hub.Handler(matchID, authenticatedUserID).ServeHTTP(w, r)
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
