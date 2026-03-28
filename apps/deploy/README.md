# Production Deploy

Production контур проекта:

- `deploy/docker-compose.prod.yml` — весь стек: `caddy + frontend + backend + postgres + minio`
- `deploy/Caddyfile` — reverse proxy и TLS
- `deploy/scripts/render-prod-values.sh` — генерирует `deploy/runtime/values_prod.yaml`
- `deploy/scripts/deploy.sh` — запускает production deploy

Минимальный порядок:

1. Создать `deploy/.env.prod` по примеру `deploy/.env.prod.example`
2. Положить секреты в `deploy/runtime/secrets/prod/*`
3. Запустить:

```bash
bash deploy/scripts/deploy.sh
```

Секреты-файлы:

- `database_url`
- `postgres_password`
- `minio_root_user`
- `minio_root_password`
- `s3_access_key`
- `s3_secret_key`
- `telegram_bot_token`

Нужны DNS записи:

- `${APP_HOST}` -> сервер
- `${API_HOST}` -> сервер
- `${S3_HOST}` -> сервер
- `${MINIO_CONSOLE_HOST}` -> сервер

Если `minio` console не нужен снаружи, можно удалить блок `{$MINIO_CONSOLE_HOST}` из `deploy/Caddyfile`.
