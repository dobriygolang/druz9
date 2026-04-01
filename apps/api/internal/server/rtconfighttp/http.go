package rtconfighttp

import (
	"encoding/json"
	"net/http"
	"strings"

	"api/internal/rtc"
)

type configItem struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Type     string `json:"type"`
	Writable bool   `json:"writable"`
	Usage    string `json:"usage"`
	Group    string `json:"group"`
}

func handleConfigList(rtcService ConfigService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !isAdmin(r, authorizer) {
			http.Error(w, "admin required", http.StatusForbidden)
			return
		}
		if r.Method != http.MethodGet {
			http.NotFound(w, r)
			return
		}

		variables := rtcService.ListVariables(r.Context())
		items := make([]configItem, 0, len(variables))
		for _, variable := range variables {
			items = append(items, configItem{
				Key:      string(variable.Key),
				Value:    variable.Value().String(),
				Type:     variable.Type,
				Writable: variable.Writable,
				Usage:    variable.Usage,
				Group:    variable.Group,
			})
		}

		writeJSON(w, http.StatusOK, map[string]any{"configs": items})
	}
}

func handleConfigKey(rtcService ConfigService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !isAdmin(r, authorizer) {
			http.Error(w, "admin required", http.StatusForbidden)
			return
		}

		key := strings.TrimPrefix(r.URL.Path, KeyPath)
		if key == "" {
			http.NotFound(w, r)
			return
		}

		switch r.Method {
		case http.MethodGet:
			variables := rtcService.ListVariables(r.Context())
			variable, ok := variables[rtc.Key(key)]
			if !ok {
				http.NotFound(w, r)
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"key":      string(variable.Key),
				"value":    variable.Value().String(),
				"type":     variable.Type,
				"writable": variable.Writable,
				"usage":    variable.Usage,
				"group":    variable.Group,
			})
		case http.MethodPut:
			var req struct {
				Value string `json:"value"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid request", http.StatusBadRequest)
				return
			}
			if err := rtcService.SetValue(r.Context(), rtc.Key(key), req.Value); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"key":     key,
				"value":   req.Value,
				"success": true,
			})
		default:
			http.NotFound(w, r)
		}
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
