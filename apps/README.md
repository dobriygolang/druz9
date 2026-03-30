# druz9 apps

Монорепа сервисов:
- `api` — backend (Go, Kratos, PostgreSQL, MinIO, LiveKit, Prometheus, Grafana)
- `front` — frontend (React + Vite)
- `notification-service` — отдельный сервис уведомлений

## Быстрый локальный запуск (front + back + infra)

### 1) Infra + monitoring
```bash
cd api
cp -n .env.example .env
make docker-up
```

Поднимутся:
- PostgreSQL: `localhost:5432`
- MinIO S3 API: `localhost:9010`
- MinIO Console: `http://localhost:9011`
- LiveKit: `localhost:7880`
- Prometheus: `http://localhost:9091`
- Grafana: `http://localhost:3001` (`admin/admin`)

### 2) Backend
```bash
cd api
CONFIG_PROFILE=local make run
```

Backend endpoints:
- HTTP API: `http://localhost:8080`
- gRPC: `localhost:9000`
- Metrics/pprof: `http://localhost:8081/metrics`

### 3) Frontend
```bash
cd front
cp -n .env.example .env
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend: `http://localhost:5173`

Важно для подкастов и мобильных клиентов:
- в `api/.platform/values_local.yaml` для `s3_public_endpoint` должен быть внешний адрес, доступный клиенту;
- если тестируете с телефона в той же сети: `http://<LAN-IP-вашего-хоста>:9010`;
- `localhost` для телефона не подходит.

## Production Deploy

Production контур теперь находится в [`deploy`](./deploy):

- `deploy/docker-compose.prod.yml` поднимает `frontend + backend + postgres + minio`
- внешний `nginx` и SSL живут на хосте, не в docker compose
- контейнеры публикуются только в `127.0.0.1`
- runtime secrets лежат в `deploy/runtime/secrets/prod/*`
- runtime values генерируются в `deploy/runtime/values_prod.yaml` из `.env.prod` без записи секретов в файл

Подробности и актуальные шаги см. в [`deploy/README.md`](./deploy/README.md).

## GitHub Actions

В репозитории используются workflow:

- `.github/workflows/ci.yml` — тесты `api`, тесты `notification-service`, build `front`, проверка `deploy` shell/compose
- `.github/workflows/cd.yml` — production deploy по `workflow_run` после успешного `CI` на ветке `main` или вручную через `workflow_dispatch`

Для `CD` нужны GitHub Secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_SSH_PORT`
- `DEPLOY_APP_DIR`
- `APP_HOST`
- `API_HOST`
- `APP_EMAIL`
- `TELEGRAM_BOT_NAME`
- `ARENA_REQUIRE_AUTH`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `S3_BUCKET`
- `S3_REGION`
- `COOKIE_DOMAIN`
- `S3_PUBLIC_ENDPOINT`
- `S3_HOST`
- `MINIO_CONSOLE_HOST`
- `MINIO_CONSOLE_BASIC_AUTH`
- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`

Совместимость:
- workflow также умеет читать старые `ORACLE_*` secrets как fallback, но это только временный мост
- для нового контура лучше хранить только `DEPLOY_*` и не привязывать названия переменных к конкретному хостингу
