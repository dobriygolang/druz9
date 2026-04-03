package sandboxrunner

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"api/internal/sandbox"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func NewHTTPHandler(service *Service) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		started := time.Now()
		w.Header().Set("Content-Type", "application/json")
		observeRequest("/healthz", "ok", started)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/execute", func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		if r.Method != http.MethodPost {
			observeRequest("/execute", "method_not_allowed", started)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var envelope sandbox.ExecuteEnvelope
		if err := json.NewDecoder(r.Body).Decode(&envelope); err != nil {
			observeRequest("/execute", "bad_request", started)
			http.Error(w, "invalid execute payload", http.StatusBadRequest)
			return
		}

		execStarted := time.Now()
		result, err := service.Execute(r.Context(), envelope.Request)
		executionDuration.Observe(time.Since(execStarted).Seconds())
		response := sandbox.ExecuteResponseEnvelope{}
		if err != nil {
			response.Error = strings.TrimSpace(err.Error())
			executionsTotal.WithLabelValues("error").Inc()
			observeRequest("/execute", "error", started)
		} else {
			response.Result = &result
			executionsTotal.WithLabelValues("success").Inc()
			observeRequest("/execute", "ok", started)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	})
	return mux
}
