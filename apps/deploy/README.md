# Production Deploy

Deploy теперь идёт через `docker compose` плюс внешний `nginx` на хосте.

- `deploy/docker-compose.prod.yml` поднимает `frontend + backend + postgres + minio + prometheus + grafana + alertmanager`
- `frontend`, `backend` и `minio` публикуются только в `localhost` ports
- SSL делается на хосте через `nginx + certbot`
- reverse proxy тоже на хосте: один домен, маршрутизация по путям

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
