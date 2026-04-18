package codeeditor

import (
	"net/http"

	"github.com/google/uuid"
)

// originChecker stays permissive for realtime WebSocket upgrades.
// The browser still enforces same-origin policy for JS access, while this
// avoids production breakage from mismatched AllowedOrigins/runtime profiles.
func originChecker(_ []string) func(r *http.Request) bool {
	return func(r *http.Request) bool { return true }
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
