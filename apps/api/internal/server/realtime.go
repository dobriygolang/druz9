package server

import (
	"net/http"
	"strings"

	"api/internal/realtime"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const codeEditorRealtimePrefix = "/api/v1/code-editor/realtime/"

func RegisterCodeEditorRealtime(srv *kratoshttp.Server, hub *realtime.CodeEditorHub) {
	srv.HandlePrefix(codeEditorRealtimePrefix, codeEditorRealtimeHandler(hub))
}

func codeEditorRealtimeHandler(hub *realtime.CodeEditorHub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(codeEditorRealtimePrefix, func(w http.ResponseWriter, r *http.Request) {
		roomID, ok := parseCodeEditorRealtimeRoomID(r)
		if !ok {
			http.NotFound(w, r)
			return
		}
		hub.Handler(roomID).ServeHTTP(w, r)
	})
	return mux
}

func parseCodeEditorRealtimeRoomID(r *http.Request) (string, bool) {
	if !strings.HasPrefix(r.URL.Path, codeEditorRealtimePrefix) {
		return "", false
	}

	roomID := strings.TrimPrefix(r.URL.Path, codeEditorRealtimePrefix)
	if roomID == "" || strings.Contains(roomID, "/") {
		return "", false
	}

	return roomID, true
}
