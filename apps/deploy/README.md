# Production Deploy

Deploy теперь идёт через `docker compose` плюс внешний `nginx` на хосте.

- `deploy/docker-compose.prod.yml` поднимает `frontend + backend + postgres + minio + prometheus + grafana + alertmanager`
- `frontend`, `backend` и `minio` публикуются только в `localhost` ports
- SSL делается на хосте через `nginx + certbot`
- reverse proxy тоже на хосте: один primary domain и при необходимости alias-домены

Что нужно подготовить:

1. Создать `deploy/.env.prod` по примеру `deploy/.env.prod.example`
2. Проверить `api/.platform/values_prod.yaml` как единственный runtime-config для backend
3. Положить секреты в `deploy/runtime/secrets/prod/*`
4. Запустить:

```bash
bash deploy/scripts/deploy.sh
```

Обязательные secret files:

- `database_url`
- `postgres_password`
- `minio_root_user`
- `minio_root_password`
- `s3_access_key`
- `s3_secret_key`
- `telegram_bot_token`
- `telegram_alert_chat_id`
- `ai_review_api_key`

Важно:

- `deploy/.env.prod` не коммитится
- `deploy/runtime/secrets/prod/*` не коммитятся
- `api/.platform/values_prod.yaml` это единственный source of truth для runtime-настроек backend
- `deploy/.env.prod` хранит только infra/public compose-переменные: hostnames, db user/db name, minio console host, region, basic auth
- backend secrets не дублируются ни в yaml, ни в `.env.prod`: они читаются только из `deploy/runtime/secrets/prod/*`
- `deploy/scripts/validate-config.sh` проверяет, что `values_local` и `values_prod` не разъехались по ключам
- `telegram_alert_chat_id` это chat id, куда Alertmanager будет слать боевые уведомления через Telegram bot
- `ai_review_api_key` это токен провайдера нейронки для system-design review и AI feedback

## Несколько доменов

Поддержка `druz9.online` и `druz9.ru` возможна, но есть важный нюанс:

- один cookie domain нельзя разделить между `.online` и `.ru`
- поэтому для настоящей multi-domain схемы session cookies должны быть `host-only`
- в `api/.platform/values_prod.yaml` для этого `cookie_domain` должен быть пустым

Рекомендуемая схема:

- `APP_HOST` — канонический primary домен, например `druz9.online`
- `APP_ALIASES` — список alias-доменов для хостового `nginx`, например `druz9.ru`
- `s3_public_endpoint` — тоже канонический домен, обычно `https://druz9.online`

Что это даёт:

- оба домена будут открывать сайт и API через один и тот же хостовый `nginx`
- но логин-сессия будет отдельной на каждом домене

Если нужен один общий логин без повторной авторизации, лучше не держать оба домена “живыми” одновременно, а сделать редирект:

- `druz9.ru` -> `https://druz9.online$request_uri`

### Пример host nginx для двух доменов без редиректа

```nginx
server {
    listen 80;
    server_name druz9.online druz9.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name druz9.online druz9.ru;

    ssl_certificate /etc/letsencrypt/live/druz9.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/druz9.online/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /metrics/grafana/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Пример host nginx с каноническим доменом

```nginx
server {
    listen 80;
    server_name druz9.ru;
    return 301 https://druz9.online$request_uri;
}

server {
    listen 443 ssl http2;
    server_name druz9.ru;
    ssl_certificate /etc/letsencrypt/live/druz9.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/druz9.online/privkey.pem;
    return 301 https://druz9.online$request_uri;
}
```
