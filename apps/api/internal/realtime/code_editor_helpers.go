package realtime

import (
	"net/http"

	"github.com/google/uuid"
)

// originChecker returns a CheckOrigin function for WebSocket upgraders.
// If allowedOrigins is empty, all origins are allowed (dev mode).
func originChecker(allowedOrigins []string) func(r *http.Request) bool {
	if len(allowedOrigins) == 0 {
		return func(r *http.Request) bool { return true }
	}
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = struct{}{}
	}
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		_, ok := allowed[origin]
		return ok
	}
}

func mustParseUUID(raw string) uuid.UUID {
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil
	}
	return parsed
}

func parseOptionalUUID(raw string) *uuid.UUID {
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return nil
	}
	return &parsed
}
