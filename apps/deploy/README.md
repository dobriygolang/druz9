# Production Deploy

Deploy теперь идёт через `docker compose` плюс внешний `nginx` на хосте.

- `deploy/docker-compose.prod.yml` поднимает `frontend + backend + postgres + minio`
- `frontend`, `backend` и `minio` публикуются только в `localhost` ports
- SSL делается на хосте через `nginx + certbot`
- reverse proxy тоже на хосте: один домен, маршрутизация по путям

Что нужно подготовить:

1. Создать `deploy/.env.prod` по примеру `deploy/.env.prod.example`
2. Создать `deploy/runtime/values_prod.yaml` на основе `deploy/runtime/values_prod.yaml.example`
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

Важно:

- `deploy/.env.prod` не коммитится
- `deploy/runtime/secrets/prod/*` не коммитятся
- `deploy/runtime/values_prod.yaml` должен быть заполнен корректно для backend
- в репозитории хранится только шаблон `deploy/runtime/values_prod.yaml.example`
