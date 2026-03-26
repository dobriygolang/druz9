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

## Деплой на Oracle Cloud (одна VM)

Ниже минимальный рабочий путь для MVP.

### 1) Подготовка VM
- Ubuntu 22.04+ (ARM/AMD64)
- Открыть Security List/NSG порты:
  - `22` (SSH)
  - `80/443` (Nginx)
  - `7880/7881` + UDP `50010-50100` (LiveKit, если нужен прямой доступ)
  - `9001` (MinIO Console, опционально и лучше ограничить по IP)
  - `3001` (Grafana, опционально и лучше ограничить по IP)

Установка:
```bash
sudo apt update
sudo apt install -y git curl ca-certificates nginx
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2) Клонирование проекта
```bash
git clone <YOUR_REPO_URL> /opt/druz9
cd /opt/druz9/apps
```

### 3) Конфиг backend (`prod` профиль)
Отредактировать:
- `api/.platform/values_prod.yaml`

Критично заполнить:
- `database_url`
- `telegram_bot_token`
- `s3_endpoint` (внутренний адрес MinIO, обычно `http://minio:9000` если backend в docker-сети)
- `s3_public_endpoint` (внешний адрес для presigned URL, доступный клиентам)
- `s3_bucket`
- `s3_access_key`
- `s3_secret_key`
- `livekit_url`
- `livekit_public_url`
- `livekit_api_key`
- `livekit_api_secret`
- `server_http_addr`, `server_grpc_addr`, `metrics_addr`

### 4) Поднять infra
```bash
cd /opt/druz9/apps/api
cp -n .env.example .env
docker compose -f docker-compose.yaml up -d
```

### 5) Запуск backend как systemd-сервис
Сборка:
```bash
cd /opt/druz9/apps/api
make build
```

Создать `/etc/systemd/system/druz9-api.service`:
```ini
[Unit]
Description=druz9 api
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/druz9/apps/api
Environment=CONFIG_PROFILE=prod
ExecStart=/opt/druz9/apps/api/bin/api
Restart=always
RestartSec=3
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
```

Запуск:
```bash
sudo systemctl daemon-reload
sudo systemctl enable druz9-api
sudo systemctl restart druz9-api
sudo systemctl status druz9-api --no-pager
```

### 6) Frontend build + Nginx
```bash
cd /opt/druz9/apps/front
cp -n .env.example .env
# укажи прод API домен
# VITE_API_URL=https://api.<your-domain>
npm ci
npm run build
```

Пример Nginx:
```nginx
server {
  listen 80;
  server_name <your-domain>;

  root /opt/druz9/apps/front/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Проверка и reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7) GitHub CI/CD (push в `main` => автодеплой)

В репозитории добавлены workflow:
- `.github/workflows/ci.yml` — тесты `api`, `notification-service` + build `front`
- `.github/workflows/cd-oracle.yml` — деплой на Oracle VM после успешного `CI` для ветки `main`

Нужно завести GitHub Secrets:
- `ORACLE_HOST` — IP/домен VM
- `ORACLE_USER` — SSH user (например, `ubuntu`)
- `ORACLE_SSH_KEY` — приватный SSH ключ (PEM)
- `ORACLE_SSH_PORT` — опционально, по умолчанию `22`
- `ORACLE_APP_DIR` — опционально, по умолчанию `/opt/druz9/apps`
- `ORACLE_API_SERVICE_NAME` — опционально, по умолчанию `druz9-api`

Важно:
- на VM должны быть уже настроены `api/.env`, `front/.env`, `api/.platform/values_prod.yaml`
- пользователь для деплоя должен иметь `sudo` без пароля для команд:
  - `systemctl restart druz9-api`
  - `systemctl reload nginx`
  - `nginx -t`

Скрипт деплоя на сервере:
- `deploy/oracle/deploy.sh`

## Проверка после запуска
- Backend health/ручки: через `http://<host>:8080/...`
- Metrics: `http://<host>:8081/metrics`
- Grafana: `http://<host>:3001` (лучше ограничить доступ по IP/VPN)
- MinIO Console: `http://<host>:9011`

## Полезные команды
```bash
# backend logs
sudo journalctl -u druz9-api -f

# infra logs
cd /opt/druz9/apps/api
docker compose logs -f postgres minio livekit prometheus grafana

# миграции вручную
cd /opt/druz9/apps/api
make migrate-status
make migrate-up
```
