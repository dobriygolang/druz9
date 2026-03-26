# notification-service

Минимальный backend-каркас под уведомления в структуре, совместимой с `apps/api`.

Что уже настроено:
- env-based config
- `rtc` через [`.platform/values.yaml`](/Users/sedorofeevd/Desktop/druz9/apps/notification-service/.platform/values.yaml)
- `docker-compose` для локального Postgres
- `goose` миграции
- короткий `Makefile` под реальные команды

Основные команды:

```bash
make generate
make build
make lint
make docker-up
make docker-down
make docker-migrate-up
make docker-migrate-down
```

Локальный запуск:

```bash
cp .env.example .env
make run
```
