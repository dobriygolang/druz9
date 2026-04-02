# AGENTS.md

## ⚠️ ВАЖНЫЕ ИНСТРУКЦИИ ⚠️

- **НИКОГДА** не упоминай CHATGPT, Codex или Anthropic в сообщениях
  коммитов или генерируемом коде
- **НИКОГДА** не добавляй теги вроде "Generated with CHATGPT" ни в какие
  материалы

## Дополнительные ресурсы и руководства

- [Uber Go Style Guide](.vscode/style.md) - руководство по стилю кода Go
  от Uber
- [Effective Go](https://golang.org/doc/effective_go) - официальное
  руководство по идиоматическому Go

При работе с Go-проектами всегда следуй принципам Effective Go и
руководству по стилю Uber Go.

## Mandatory startup

Before starting any task:

1. Read `.ai/router.md`
2. Use it to classify the request into exactly one primary category:
   `product`, `engineering`, `frontend`, `design`, `testing`,
   `research`, or `writing`
3. Select exactly one skill from `.ai/skills/`
4. Read the selected skill fully before doing the task
5. Follow the selected skill's Process, Output format, Quality bar, and
   Anti-patterns
6. If no skill clearly matches, follow `.ai/router.md` fallback rules and
   still produce the answer using its Output Contract

## Routing rules are mandatory

- For each user request, use exactly one skill
- Do not combine multiple skills in one response unless the router
  explicitly allows it
- If the user explicitly names a skill, prefer that skill
- If multiple skills seem relevant, choose the one that best matches the
  final deliverable
- Prefer the more specific skill over the more general one
- For UI polish, spacing, layout, and visual hierarchy, treat the task as
  `design` and prefer `.ai/skills/frontend_design.md`
- For frontend implementation, component logic, state, rendering, and
  performance, treat the task as `frontend` and prefer
  `.ai/skills/senior_frontend.md`

## Инструменты

- Форматирование: `gofmt`, при необходимости `goimports`
- Анализаторы: `staticcheck`, `go vet ./...`, `make run` если доступно,
  `make test` для тестов
- Генерация protobuf/mocks: `go generate ./...` или конкретные команды из
  `//go:generate` директив

## Типичные проверки перед ревью

- Код проходит `go test ./...` или целевые пакеты, если полный прогон
  невозможен
- Обязательно прогоняй линтер перед завершением задачи:
  `golangci-lint run` минимум по затронутым пакетам, при возможности по
  всему проекту
- Нет неиспользуемых зависимостей в `go.mod` и `go.sum`:
  `go mod tidy`
- Логи и ошибки сформулированы на английском, начинаются с маленькой
  буквы и содержат контекст

## Руководство по оформлению Git-коммитов

При создании сообщений для Git-коммитов следуй этим правилам.

### Стандарт сообщений коммитов

Цель: создать одно сообщение в формате Conventional Commit.

### Структура сообщения

**ПЕРВАЯ СТРОКА**:
Шаблон: `<тип>(<опциональная_область>): <краткое_описание>`

Правила:
- длина первой строки не более 72 символов
- оптимальная длина около 50 символов

`<тип>`: проанализируй весь diff и выбери один основной тип:
- `feat` — новая функциональность
- `fix` — исправление ошибки
- `chore` — обслуживание кода
- `refactor` — рефакторинг кода
- `test` — добавление или изменение тестов
- `docs` — изменение документации
- `style` — форматирование, отступы и подобные изменения
- `perf` — улучшение производительности
- `ci` — изменения в CI
- `build` — изменения в сборке

`<опциональная_область>`:
- укажи конкретный компонент, если это делает сообщение точнее
- иначе опусти область

`<краткое_описание>`:
- используй повелительное наклонение и настоящее время
- не используй заглавную букву в начале, если это не имя собственное
  или аббревиатура
- не ставь точку в конце
- кратко суммируй основную цель всех изменений

**ТЕЛО**:
Если используется, отделяй от первой строки одной пустой строкой.

Правила:
- каждая строка в теле не длиннее 72 символов
- объясняй что изменилось и почему
- если diff включает несколько аспектов, используй маркированные пункты
  с префиксом `- `
- не создавай внутри тела новые строки в формате `type(scope): ...`

Пример:
```text
- introduce Taskfile.yml to automate common development workflows
- update .gitignore to exclude temporary build files
- refactor user tests for clarity