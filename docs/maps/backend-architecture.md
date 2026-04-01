# Backend Architecture

## Целевая модель

Для каждой крупной фичи backend должен стремиться к одной и той же схеме:

- `internal/domain/<feature>/` — контракты, entities, чистая бизнес-логика без транспорта и SQL.
- `internal/app/<feature>/` — orchestration use-cases, coordination нескольких domain/data зависимостей.
- `internal/data/<feature>/` — реализация репозиториев, SQL, storage adapters.
- `internal/api/<feature>/` — gRPC/HTTP service adapters, если фича живет в protobuf/API service слое.
- `internal/server/` — shared transport wiring, metrics, cookies, ops и thin wrappers.
- `internal/server/<feature>http/` — ручные feature-specific HTTP handlers, пока фича еще не переехала в `internal/api` или отдельный сервис.
- `internal/<integration>/` — внешние интеграции и background workers; внутри тоже избегаем монолитных файлов и режем по `service`, `client`, `updates`, `types`, `auth`.

## Практики разбиения

- В одном data-файле не держим сразу tasks, queue, stats, submissions и scan helpers.
- Большие repo-файлы режем по use-case группам: `tasks`, `matches`, `queue`, `players`, `stats`, `submissions`, `scan`.
- Базовый `repo.go` должен содержать только struct/constructor/interfaces, без длинного SQL.
- В transport слое избегаем смешения request parsing, auth, domain mapping и business branching в одном файле.
- Если ручной HTTP feature разрастается, выносим его в подпакет `internal/server/<feature>http/`.
- В корне `internal/server/` оставляем только `Register...` wrappers и cross-feature инфраструктуру.
- В `internal/api/<feature>/` крупные adapter-файлы режем минимум на `service`, `helpers`, `mapping_*`, `requests`, `responses`.
- В integration/worker пакетах не держим transport loop, HTTP client и payload types в одном файле.
- Неиспользуемые зависимости в repo/service struct удаляем сразу, не держим "на будущее".

## Текущие проблемные узлы

- `internal/data/arena/repo.go`
- `internal/data/code_editor/repo.go`
- `internal/data/profile/repo.go`
- `internal/server/*` ручные HTTP handlers
- смешение `internal/api/*` и `internal/server/*` как двух transport слоев

## Порядок рефактора

1. Разрезать крупные `data/*/repo.go`.
2. Стабилизировать feature boundaries: domain/app/data/api.
3. Перенести ручные feature handlers из `internal/server` в feature-подпакеты `internal/server/<feature>http/`.
4. После этого уже проще выделять модуль в отдельный сервис без переписывания всего слоя доступа.

## Уже применено

- `internal/server/arenahttp/` — queue, open matches, realtime arena transport.
- `internal/server/interviewprephttp/` — public/admin interview prep HTTP.
- `internal/server/rtconfighttp/` — admin runtime config HTTP.
- `internal/server/adminusershttp/` — admin user trust management HTTP.
- `internal/api/arena/` — mapping вынесен в `mapping_enums`, `mapping_match`, `mapping_realtime`.
- `internal/api/code_editor/` — mapping вынесен в `mapping_enums`, `mapping_room`, `mapping_task`, `mapping_submission`.
- `internal/telegrambot/` — bot split на `service`, `client`, `updates`, `types`.
