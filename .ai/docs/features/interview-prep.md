# Interview Prep

## Цель

Подготовка к Go-собеседованиям для trusted-пользователей: задача, затем прикрепленные к ней follow-up вопросы в фиксированном порядке.

## Где находится код

- Backend service: `apps/api/internal/app/interviewprep/`
- Backend repo: `apps/api/internal/data/interviewprep/`
- User HTTP handlers: `apps/api/internal/server/interview_prep.go`
- Admin HTTP handlers: `apps/api/internal/server/admin_interview_prep.go`
- Seed catalog: `apps/api/scripts/seeds/catalogs/interview_prep.json`
- Seed loader: `apps/api/internal/seeds/interview_prep.go`
- Frontend API: `apps/front/src/features/InterviewPrep/api/interviewPrepApi.ts`
- User pages: `apps/front/src/pages/InterviewPrepPage/`, `apps/front/src/pages/InterviewPrepSessionPage/`
- Admin page: `apps/front/src/pages/InterviewPrepAdminPage/`

## Текущее состояние

- Пользователь может выбрать сценарий interview prep и стартовать сессию.
- Вопросы привязаны к конкретной задаче и идут последовательно.
- После самооценки раскрывается ответ на предыдущий вопрос.
- Сиды хранятся как catalog pack, а не как отдельный SQL seed.

## Ограничения

- Реальный executable submit flow для interview prep пока не включен.
- Сейчас сценарии идут как guided flow с честной самооценкой пользователя.

## Последний структурный рефактор

- `internal/data/interviewprep` разделен на `tasks.go`, `questions.go`, `sessions.go`.
- `internal/seeds` разделен на `runner.go`, `records.go`, `sql.go` и pack-specific файлы.
- Навигационные markdown-файлы перенесены в `docs/`.
