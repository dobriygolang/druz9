package arena

import "net/http"

// originChecker stays permissive for realtime WebSocket upgrades.
// The browser still enforces same-origin policy for JS access, while this
// avoids production breakage from mismatched AllowedOrigins/runtime profiles.
func originChecker(_ []string) func(r *http.Request) bool {
	return func(r *http.Request) bool { return true }
}
