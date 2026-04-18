@AGENTS.md

# Дополнительные инструкции для Claude Code

## Приоритет правил

- Сначала следуй `AGENTS.md`
- Перед началом любой задачи обязательно прочитай `.ai/router.md`
- По `.ai/router.md` выбери ровно **одну** категорию и ровно **один**
  skill из `.ai/skills/`
- Полностью прочитай выбранный skill перед выполнением задачи
- Следуй `Process`, `Output format`, `Quality bar` и `Anti-patterns`
  выбранного skill
- Если skill не найден однозначно, используй fallback из `.ai/router.md`,
  но все равно соблюдай его `Output Contract`
- Не смешивай несколько skills в одном ответе

## Быстрые правила роутинга

Используй эти категории из `.ai/router.md`:

- `product` — PRD, MVP, user stories, acceptance criteria, roadmap
- `engineering` — backend, debugging, implementation, refactoring,
  architecture, PR changes
- `frontend` — frontend implementation, React/TypeScript, state,
  rendering, performance
- `design` — UI polish, layout, spacing, typography, design system
- `testing` — Playwright, e2e, QA steps, bug reproduction
- `research` — research, comparisons, landscape, cited summaries
- `writing` — articles, posts, editing, structure, storytelling

### Обязательные tie-break rules

- Если задача про review существующего кода, diff, PR, риски,
  регрессии или пробелы в тестах — выбирай
  `.ai/skills/code_review.md`
- Если задача про backend-реализацию, API, DB, сервисы, отладку или
  надежность — выбирай `.ai/skills/senior_backend.md`
- Если задача про high-level system design, границы сервисов,
  масштабирование и trade-offs — выбирай
  `.ai/skills/senior_architect.md`
- Если задача про frontend implementation, state management,
  rendering, performance — выбирай
  `.ai/skills/senior_frontend.md`
- Если задача про UI polish, layout, visual hierarchy, spacing,
  readability — выбирай `.ai/skills/frontend_design.md`
- Если задача про tokens, reusable patterns, typography scale,
  spacing rules, design consistency — выбирай
  `.ai/skills/ui_design_system.md`

## Проект

Go-микросервис API с Kratos framework.

## Структура проекта

Полную структуру проекта читай в:

- `./docs/maps/backend-architecture.md`
- `./docs/maps/codebase.md`
- `./docs/features/interview-prep.md`

Базовая структура:

```text
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