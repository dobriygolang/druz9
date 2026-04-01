# Interview Prep Feature - Сводка

## Цель задачи

Добавить функционал "Interview Prep" - систему для практики кодинга и подготовки к техническим интервью. Пользователи могут решать задачи, отвечать на вопросы и получать оценку своих навыков.

## Что сделано

### 1. Backend (Go)

**Новые файлы:**
- `apps/api/internal/data/interviewprep/repo.go` - CRUD операции для задач и вопросов
- `apps/api/internal/server/admin_interview_prep.go` - Admin HTTP endpoints

**Изменённые файлы:**
- `apps/api/cmd/api/run.go` - регистрация admin роутов

**API Endpoints:**
- `GET /api/admin/interview-prep/tasks` - список всех задач
- `POST /api/admin/interview-prep/tasks` - создать задачу
- `PUT /api/admin/interview-prep/tasks/{id}` - обновить задачу
- `DELETE /api/admin/interview-prep/tasks/{id}` - удалить задачу
- `GET /api/admin/interview-prep/tasks/{id}/questions` - список вопросов
- `POST /api/admin/interview-prep/tasks/{id}/questions` - создать вопрос
- `PUT /api/admin/interview-prep/tasks/{id}/questions/{qid}` - обновить вопрос
- `DELETE /api/admin/interview-prep/tasks/{id}/questions/{qid}` - удалить вопрос

### 2. Frontend (React/TypeScript)

**Новые файлы:**
- `apps/front/src/pages/InterviewPrepAdminPage/ui/InterviewPrepAdminPage.tsx` - UI для админов

**Изменённые файлы:**
- `apps/front/src/features/InterviewPrep/api/interviewPrepApi.ts` - добавлены admin методы
- `apps/front/src/app/providers/RouterProvider.tsx` - добавлен роут `/admin/interview-prep`
- `apps/front/src/widgets/Sidebar/ui/Sidebar.tsx` - добавлена ссылка в админ-меню
- `apps/front/src/app/styles/05-layout.css` - добавлены стили для модальных окон
- `apps/front/src/pages/CodeRoomsPage/ui/CodeRoomsPage.tsx` - добавлен "Interview Prep" в "Быстрый запуск"

### 3. Модель данных

**InterviewPrepTask:**
- id, slug, title, statement
- prepType (coding|algorithm|system_design|sql|code_review)
- language, executionProfile, runnerMode
- durationSeconds, starterCode, referenceSolution
- isActive

**InterviewPrepQuestion:**
- id, taskId, position
- prompt, answer

## Что осталось сделать

1. Проверить что редактирование задач работает
2. Проверить что UI помещается в окно (скролл)
3. Убедиться что всё сохраняется в БД

## Исправленные баги

1. Модальное окно не помещалось в экран - добавлены CSS стили для скролла
2. При редактировании интерфейс пропадал - исправлена структура div в модальном окне вопросов