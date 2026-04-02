@AGENTS.md

# Дополнительные инструкции для Claude Code

## Проект

Go-микросервис API с Kratos framework.

## Структура проекта

```
cmd/api/           # точка входа (main.go, run.go)

internal/
├── admin/         # domain service для admin
│   └── service/   # Repository интерфейс и domain service
│
├── api/           # gRPC service wrappers (реализуют protobuf интерфейсы)
│   ├── admin/
│   ├── event/
│   ├── geo/
│   ├── podcast/
│   ├── profile/
│   └── referral/
│
├── data/          # репозитории (работа с БД)
│   ├── event/
│   ├── geo/
│   ├── podcast/
│   ├── profile/
│   └── referral/
│
├── event/         # domain service для event
│   └── service/   # Repository интерфейс и domain service
│
├── geo/           # domain service для geo
│   └── service/   # Resolver интерфейс и domain service
│
├── model/         # доменные модели
│
├── podcast/       # domain service для podcast
│   └── service/   # Repository/Storage интерфейсы и domain service
│
├── profile/       # domain service для profile
│   └── service/   # Repository/SessionStorage интерфейсы и domain service
│
├── referral/      # domain service для referral
│   └── service/   # Repository интерфейс и domain service
│
├── server/        # HTTP/gRPC серверы, middleware
│
└── storage/       # хранилища (S3, PostgreSQL)

pkg/api/           # сгенерированные protobuf файлы
scripts/           # конфиги (prometheus.yaml, grafana/, migrations/)
```

## Архитектура

Все домены используют паттерн: domain service в `internal/{domain}/service/` + gRPC wrapper в `internal/api/{domain}/`

Каждый domain service содержит:
- Интерфейс(ы) для data-слоя (Repository, Storage, TokenIssuer и т.д.)
- Config struct для конфигурации
- Service struct с методами бизнес-логики
- New*Service() конструктор
- Методы в отдельных файлах (one method per file)

## Сборка и тесты

- Сборка: `make build`
- Тесты: `make test`
- Линтер: `make lint`

## Мониторинг (Prometheus + Grafana)

Проект включает встроенный мониторинг:

### Конфигурация

Добавить в конфиг:
```yaml
metrics:
  addr: "0.0.0.0:9090"
```

### Endpoints
- `http://localhost:9090/metrics` — Prometheus metrics
- `http://localhost:9090/debug/pprof/*` — pprof

### Запуск мониторинга
```bash
# Создать .env из примера
cp .env.example .env

# Запустить с мониторингом
make docker-up-with-monitoring

# Или добавить prometheus/grafana к существующему
docker compose up -d prometheus grafana
```

### Доступ
- Prometheus: http://localhost:9091
- Grafana: http://localhost:3001 (admin/admin)
- Дашборд: API Overview (scripts/grafana/dashboards/api-overview.json)

### Метрики
- HTTP requests rate и latency (p50, p95, p99)
- gRPC requests rate и latency
- Error rate (5xx)
- Go runtime (goroutines, heap, memory)
- pprof для профилирования

### Алерты
Базовые алерты находятся в `scripts/prometheus/alerts/api_alerts.yaml`:

- **Availability**: `APIServiceDown` — сервис недоступен
- **HTTP Errors**: `HighHTTPErrorRate` (>5%), `CriticalHTTPErrorRate` (>15%)
- **gRPC Errors**: `HighGRPCErrorRate` (>5%)
- **Latency**: `HighHTTPLatency` (p95 >2s), `CriticalHTTPLatency` (p99 >5s)
- **Resources**: `HighMemoryUsage` (>85%), `HighGoroutineCount` (>1000)
- **Database**: `HighDBConnectionUsage` (>80%)

Алерты автоматически загружаются Prometheus из `scripts/prometheus/alerts/`.

## Стиль

- Табличные тесты с t.Parallel()
- Ранние возвраты, ошибки lowercase
- Комментарии объясняют «зачем», а не «что»
- Обязательные комментарии для экспортируемых функций и переменных (линтер revlive exported rule)