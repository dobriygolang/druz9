package sandboxrunner

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

var (
	runnerRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sandbox_runner_requests_total",
			Help: "Total number of sandbox runner HTTP requests.",
		},
		[]string{"path", "status"},
	)
	runnerRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "sandbox_runner_request_duration_seconds",
			Help:    "Latency of sandbox runner HTTP requests.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"path"},
	)
	executionsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sandbox_runner_executions_total",
			Help: "Total number of sandbox code execution attempts.",
		},
		[]string{"status"},
	)
	executionDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "sandbox_runner_execution_duration_seconds",
			Help:    "Duration of sandbox code execution requests.",
			Buckets: prometheus.DefBuckets,
		},
	)
)

func init() {
	prometheus.MustRegister(
		runnerRequestsTotal,
		runnerRequestDuration,
		executionsTotal,
		executionDuration,
	)
}

func observeRequest(path, status string, started time.Time) {
	runnerRequestsTotal.WithLabelValues(path, status).Inc()
	runnerRequestDuration.WithLabelValues(path).Observe(time.Since(started).Seconds())
}
