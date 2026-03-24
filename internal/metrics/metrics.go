package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Metrics struct {
	ReqTotal        *prometheus.CounterVec
	ReqFailureTotal prometheus.Counter
}

type Hitter interface {
	IncReqFailureTotal()
	IncReqTotal(labels prometheus.Labels)
}

func New() *Metrics {
	prefix := "friends"
	metrics := &Metrics{
		ReqTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name:      "req_total",
				Namespace: prefix,
			},
			[]string{"method", "endpoint", "code"}),
		ReqFailureTotal: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name:      "req_failure_total",
				Namespace: prefix,
			}),
	}

	prometheus.MustRegister(
		metrics.ReqTotal,
		metrics.ReqFailureTotal,
	)

	return metrics
}

// IncReqTotal увеличивает счетчик кол-ва запросов
func (m *Metrics) IncReqTotal(labels prometheus.Labels) {
	m.ReqTotal.With(prometheus.Labels{
		"method":   labels["method"],
		"endpoint": labels["endpoint"],
		"code":     labels["code"],
	}).Inc()
}

// IncReqFailureTotal увеличивает счетчик кол-ва неудавшихся запросов
func (m *Metrics) IncReqFailureTotal() {
	m.ReqFailureTotal.Inc()
}
