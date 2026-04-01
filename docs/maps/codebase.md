# Codebase Map

## Backend

- `apps/api/cmd/` — точки входа приложений (`api`, `seed`).
- `apps/api/internal/server/` — shared transport wiring, wrappers, metrics, cookies, ops.
- `apps/api/internal/server/adminusershttp/` — admin users manual HTTP handlers.
- `apps/api/internal/server/arenahttp/` — arena-specific ручные HTTP handlers.
- `apps/api/internal/server/interviewprephttp/` — interview prep public/admin HTTP handlers.
- `apps/api/internal/server/rtconfighttp/` — runtime config admin HTTP handlers.
- `apps/api/internal/app/` — application services, оркестрация use-case flow.
- `apps/api/internal/domain/` — доменные сервисы и контракты, если логика отделена от app-слоя.
- `apps/api/internal/data/` — доступ к данным и репозитории.
- `apps/api/internal/api/` — protobuf/gRPC/HTTP adapter layer по feature-папкам.
- `apps/api/internal/seeds/` — seed runner и data-pack loaders.
- `apps/api/internal/telegrambot/` — Telegram bot worker, split by client/update/types.
- `apps/api/scripts/migrations/` — миграции БД.
- `apps/api/scripts/seeds/catalogs/` — data-driven seed catalogs.

## Frontend

- `apps/front/src/app/` — providers, глобальные стили, bootstrap.
- `apps/front/src/pages/` — route-level pages.
- `apps/front/src/features/` — feature API/hooks/UI.
- `apps/front/src/widgets/` — крупные composable UI blocks.
- `apps/front/src/entities/` — shared entity models/types.
- `apps/front/src/shared/` — общие util/api/config/hooks.

## Interview Prep

- API/service flow: `apps/api/internal/app/interviewprep/`
- Repo/data access: `apps/api/internal/data/interviewprep/`
- HTTP handlers: `apps/api/internal/server/interviewprephttp/`
- Root wrappers: `apps/api/internal/server/interview_prep_wrappers.go`
- Seed catalog: `apps/api/scripts/seeds/catalogs/interview_prep.json`
- Seed pack loader: `apps/api/internal/seeds/interview_prep.go`
- Frontend API: `apps/front/src/features/InterviewPrep/api/`
- User pages: `apps/front/src/pages/InterviewPrepPage/`, `apps/front/src/pages/InterviewPrepSessionPage/`
- Admin page: `apps/front/src/pages/InterviewPrepAdminPage/`

## Refactor Direction

- Крупные репозитории делим минимум на `tasks`, `questions`, `sessions`, `admin`.
- Seed runner держим тонким: orchestration отдельно, SQL runner отдельно, seed records отдельно.
- Крупные ручные HTTP feature handlers выносим в `internal/server/<feature>http/`, а корень `internal/server/` держим тонким.
- В `internal/api/<feature>/` большие mapper/response файлы режем по смыслу: `mapping_enums`, `mapping_room`, `mapping_task`, `mapping_realtime` и т.д.
- Служебные интеграции вроде Telegram bot тоже режем по ролям: `service`, `client`, `updates`, `types`.
- Новые feature summary и архитектурные заметки кладем в `docs/features/` или `docs/maps/`, а не в корень репозитория.
