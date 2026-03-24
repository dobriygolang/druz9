package http

import (
	"context"
	"net/http"
	"some_app/internal/metrics"
	"some_app/internal/repository"
	"some_app/internal/usecase"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

type GoVacServer struct {
	logger    *zap.SugaredLogger
	pgRepo    *repository.PgRepository
	redisRepo *repository.RedisRepository
	metrics   *metrics.Metrics
}

func NewGoVacServer(ctx context.Context, logger *zap.SugaredLogger, db *repository.PgRepository, rdb *repository.RedisRepository, metrics *metrics.Metrics) GoVacServer {
	return GoVacServer{
		logger:    logger,
		pgRepo:    db,
		redisRepo: rdb,
		metrics:   metrics,
	}
}

func (s GoVacServer) ListenAndServe(ctx context.Context, addr string) error {
	httpMux := http.NewServeMux()

	dataHandler := usecase.NewDataHandler(s.pgRepo, s.logger, s.metrics, s.redisRepo)

	httpMux.HandleFunc("/sl", usecase.SuckLie) // test
	httpMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Data endpoints
	httpMux.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				s.logger.Error("panic in /data handler", zap.Any("recover", rec))
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
		}()

		switch r.Method {
		case http.MethodPost:
			dataHandler.SaveData(w, r)
		case http.MethodGet:
			dataHandler.GetData(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	//metrics
	httpMux.Handle("/metrics", promhttp.Handler())

	return http.ListenAndServe(addr, httpMux)
}
