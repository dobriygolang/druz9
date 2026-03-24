package usecase

import (
	"encoding/json"
	"fmt"
	"net/http"
	"some_app/internal/metrics"
	"some_app/internal/repository"
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/zap"
)

type DataHandler struct {
	pgRepo    *repository.PgRepository
	logger    *zap.SugaredLogger
	metrics   *metrics.Metrics
	redisRepo *repository.RedisRepository
}

func NewDataHandler(pgRepo *repository.PgRepository, logger *zap.SugaredLogger, m *metrics.Metrics, redisRepo *repository.RedisRepository) *DataHandler {
	return &DataHandler{
		pgRepo:    pgRepo,
		logger:    logger,
		metrics:   m,
		redisRepo: redisRepo,
	}
}

func SuckLie(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "suck lie")
}

func (h *DataHandler) SaveData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		h.countRequest(r.Method, "/data", http.StatusMethodNotAllowed, true)
		return
	}

	var req struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		h.countRequest(r.Method, "/data", http.StatusBadRequest, true)
		return
	}

	if req.Key == "" || req.Value == "" {
		http.Error(w, "Key and value are required", http.StatusBadRequest)
		h.countRequest(r.Method, "/data", http.StatusBadRequest, true)
		return
	}

	item, err := h.pgRepo.SaveData(r.Context(), req.Key, req.Value)
	if err != nil {
		h.logger.Error("Failed to save data", zap.Error(err))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		h.countRequest(r.Method, "/data", http.StatusInternalServerError, true)
		return
	}

	if h.redisRepo != nil {
		if payload, err := json.Marshal(item); err == nil {
			if err := h.redisRepo.Set(r.Context(), h.redisKey(req.Key), string(payload)); err != nil {
				h.logger.Warn("Failed to cache data", zap.Error(err))
			}
		} else {
			h.logger.Warn("Failed to marshal cached data", zap.Error(err))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
	h.countRequest(r.Method, "/data", http.StatusOK, false)
}

func (h *DataHandler) GetData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		h.countRequest(r.Method, "/data", http.StatusMethodNotAllowed, true)
		return
	}

	key := r.URL.Query().Get("key")

	if key != "" {
		if h.redisRepo != nil {
			if cached, err := h.redisRepo.Get(r.Context(), h.redisKey(key)); err == nil && cached != "" {
				var cachedItem repository.DataItem
				if err := json.Unmarshal([]byte(cached), &cachedItem); err == nil {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(cachedItem)
					h.countRequest(r.Method, "/data", http.StatusOK, false)
					return
				}
				h.logger.Warn("Failed to unmarshal cached data", zap.Error(err))
			}
		}

		item, err := h.pgRepo.GetData(r.Context(), key)
		if err != nil {
			h.logger.Error("Failed to get data", zap.Error(err))
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			h.countRequest(r.Method, "/data", http.StatusInternalServerError, true)
			return
		}

		if item == nil {
			http.Error(w, "Data not found", http.StatusNotFound)
			h.countRequest(r.Method, "/data", http.StatusNotFound, true)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(item)
		h.countRequest(r.Method, "/data", http.StatusOK, false)
		return
	}

	items, err := h.pgRepo.GetAllData(r.Context())
	if err != nil {
		h.logger.Error("Failed to get all data", zap.Error(err))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		h.countRequest(r.Method, "/data", http.StatusInternalServerError, true)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
	h.countRequest(r.Method, "/data", http.StatusOK, false)
}

func (h *DataHandler) countRequest(method, endpoint string, code int, failure bool) {
	if h.metrics == nil {
		return
	}
	labels := prometheus.Labels{
		"method":   method,
		"endpoint": endpoint,
		"code":     strconv.Itoa(code),
	}
	h.metrics.IncReqTotal(labels)
	if failure {
		h.metrics.IncReqFailureTotal()
	}
}

func (h *DataHandler) redisKey(key string) string {
	return "data:" + key
}
