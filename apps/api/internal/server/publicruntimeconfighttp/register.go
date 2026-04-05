package publicruntimeconfighttp

import (
	"context"
	"encoding/json"
	"net/http"

	"api/internal/rtc"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type ConfigReader interface {
	GetValue(context.Context, rtc.Key) rtc.Value
}

func Register(srv *kratoshttp.Server, config ConfigReader) {
	router := srv.Route("/api/public/runtime-config")
	router.GET("", wrapHandler(handleGetRuntimeConfig(config)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}

func handleGetRuntimeConfig(config ConfigReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if config == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		payload := map[string]any{
			"appRequireAuth":   config.GetValue(r.Context(), rtc.AppRequireAuth).Bool(),
			"arenaRequireAuth": config.GetValue(r.Context(), rtc.ArenaRequireAuth).Bool(),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(payload)
	}
}
