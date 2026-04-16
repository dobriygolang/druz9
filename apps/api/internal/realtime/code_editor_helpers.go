package realtime

import (
	"net/http"
	"net/url"
	"strings"

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
		if normalized := normalizeOrigin(o); normalized != "" {
			allowed[normalized] = struct{}{}
		}
	}
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		normalized := normalizeOrigin(origin)
		_, ok := allowed[normalized]
		return ok
	}
}

func normalizeOrigin(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	parsed, err := url.Parse(trimmed)
	if err == nil && parsed.Scheme != "" && parsed.Host != "" {
		return strings.ToLower(parsed.Scheme + "://" + parsed.Host)
	}

	return strings.TrimRight(strings.ToLower(trimmed), "/")
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
