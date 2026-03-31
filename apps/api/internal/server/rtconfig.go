package server

import (
	"context"
	"encoding/json"
	"net/http"

	"api/internal/model"
	"api/internal/rtc"

	kratoserrpkg "github.com/go-kratos/kratos/v2/errors"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const (
	configListPath = "/api/admin/config"
	configKeyPath  = "/api/admin/config/"
)

type rtcConfigService interface {
	GetValue(context.Context, rtc.Key) rtc.Value
	SetValue(context.Context, rtc.Key, string) error
	ListVariables(context.Context) map[rtc.Key]rtc.Variable
}

type rtconfigAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func RegisterRTConfig(srv *kratoshttp.Server, rtcService rtcConfigService, authorizer rtconfigAuthorizer) {
	mux := http.NewServeMux()

	checkAdmin := func(r *http.Request) bool {
		// Check Authorization header
		token := extractToken(r, authorizer.CookieName())
		if token == "" {
			return false
		}
		authState, err := authorizer.AuthenticateByToken(r.Context(), token)
		if err != nil || authState == nil || authState.User == nil {
			return false
		}
		return authState.User.IsAdmin
	}

	mux.HandleFunc(configListPath, func(w http.ResponseWriter, r *http.Request) {
		if !checkAdmin(r) {
			http.Error(w, "admin required", http.StatusForbidden)
			return
		}
		if r.Method != http.MethodGet {
			http.NotFound(w, r)
			return
		}
		ctx := r.Context()
		variables := rtcService.ListVariables(ctx)

		type ConfigItem struct {
			Key      string `json:"key"`
			Value    string `json:"value"`
			Type     string `json:"type"`
			Writable bool   `json:"writable"`
			Usage    string `json:"usage"`
			Group    string `json:"group"`
		}

		items := make([]ConfigItem, 0, len(variables))
		for _, v := range variables {
			items = append(items, ConfigItem{
				Key:      string(v.Key),
				Value:    v.Value().String(),
				Type:     v.Type,
				Writable: v.Writable,
				Usage:    v.Usage,
				Group:    v.Group,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"configs": items})
	})

	mux.HandleFunc(configKeyPath, func(w http.ResponseWriter, r *http.Request) {
		if !checkAdmin(r) {
			http.Error(w, "admin required", http.StatusForbidden)
			return
		}
		key := r.URL.Path[len(configKeyPath):]
		if key == "" {
			http.NotFound(w, r)
			return
		}

		ctx := r.Context()

		if r.Method == http.MethodGet {
			variables := rtcService.ListVariables(ctx)
			variable, ok := variables[rtc.Key(key)]
			if !ok {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"key":      string(variable.Key),
				"value":    variable.Value().String(),
				"type":     variable.Type,
				"writable": variable.Writable,
				"usage":    variable.Usage,
				"group":    variable.Group,
			})
			return
		}

		if r.Method == http.MethodPut {
			var req struct {
				Value string `json:"value"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid request", http.StatusBadRequest)
				return
			}

			if err := rtcService.SetValue(ctx, rtc.Key(key), req.Value); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"key":     key,
				"value":   req.Value,
				"success": true,
			})
			return
		}

		http.NotFound(w, r)
	})

	srv.HandlePrefix(configListPath, mux)
}

func extractToken(r *http.Request, cookieName string) string {
	// Check Authorization header
	if header := r.Header.Get("Authorization"); header != "" {
		if len(header) > 7 && header[:7] == "Bearer " {
			return header[7:]
		}
	}
	// Check cookie
	if cookieName != "" {
		cookie, err := r.Cookie(cookieName)
		if err == nil && cookie != nil {
			return cookie.Value
		}
	}
	return ""
}

func adminForbidden() error {
	return kratoserrpkg.New(403, "FORBIDDEN", "admin required")
}