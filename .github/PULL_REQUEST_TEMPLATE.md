## Что и зачем

<!-- 1-2 предложения. Что меняется и почему — не "что сделал", а какую проблему решаем. -->

## Затронутые части

### Backend (apps/api)
<!-- Отметьте домены, которые правите. Если PR трогает >2 доменов — возможно, стоит разбить. -->

- [ ] achievement
- [ ] activity
- [ ] admin
- [ ] arena
- [ ] challenge
- [ ] circle
- [ ] codeeditor
- [ ] event
- [ ] geo
- [ ] interviewprep
- [ ] mission
- [ ] podcast
- [ ] profile
- [ ] referral
- [ ] shared (cmd/, model/, middleware/, server/, realtime/, proto/) — **требует отдельного ревью мейнтейнера**
- [ ] миграции БД (`scripts/migrations/`)
- [ ] proto (`api/**.proto`) — не забудь `make generate`

### Frontend / инфра
- [ ] apps/front
- [ ] apps/notification-service
- [ ] deploy / docker / CI

## Чеклист перед ревью

- [ ] `make lint` зелёный (включает depguard — кросс-доменные импорты запрещены)
- [ ] `go test ./...` проходит
- [ ] Новые публичные экспорты в `internal/domain/**` имеют doc-комментарии
- [ ] Не импортирую другой `internal/domain/X` напрямую — общаюсь через контракты/интерфейсы
- [ ] Не импортирую другой `internal/data/X` напрямую (кроме `data/codetasks`)
- [ ] Если меняется proto — стабы пересгенерированы (`make generate`)
- [ ] Если добавляется миграция — проверил `make migrate-up` локально

## Как проверить

<!-- Команды/шаги, которые ревьюер может выполнить, чтобы убедиться, что работает. -->
