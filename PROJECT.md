# druz9 — Project Overview

> Геймифицированная платформа подготовки к IT-интервью. Домен: **druz9.online**.
> Статус: staging, активная разработка. Тон проекта — пиксельный RPG (зал гильдии, арена, таверна-магазин, сезонный пропуск).

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Vite + React 18 + TypeScript, Zustand, react-router, Monaco editor, Yjs для collaborative editing, MapLibre GL |
| Backend | Go + gRPC + grpc-gateway (proto-first), PostgreSQL, goose для миграций |
| Notifications | отдельный сервис `apps/notification-service` (Telegram bot) |
| Auth | Telegram + Yandex OAuth |
| Deploy | Docker Compose, staging @ druz9.online |

## Структура репозитория

```
apps/
  api/                      # Go backend
    api/                    # .proto files (core/game/learning/social/adapter)
    internal/api/<domain>/  # handler/service/repo per domain
    scripts/migrations/     # goose SQL migrations (NNNNN_name.sql)
  front/                    # Vite React SPA
    src/pages/              # роуты
    src/features/           # фичи (api + UI + hooks)
    src/widgets/            # layout компоненты, overlays
    src/shared/             # ui kit, i18n, api base
  notification-service/     # Telegram worker
  deploy/                   # docker-compose, nginx
```

## Главные фичи

### Обучение
- **Atlas** (`/atlas`) — PoE-подобное древо навыков: 5 кластеров (Algo, Go, SQL, Behavioral, System Design). Центр — стартовая нода, заблокированные/доступные/открытые узлы.
- **Training tasks** — задачи с оценкой через AI-review (Claude/GPT).
- **Interview Prep Mock** — company-specific mock-интервью (Yandex, Ozon, Avito, VK, Google, Amazon, Tinkoff): blueprints → sections (SQL / Go / Behavioral / System Design) с AI-оценкой.
- **Interview Live** — AI-чат в реальном времени с моделью-интервьюером.
- **Peer Mock** — P2P собеседования между пользователями: слоты + бронь + review + reliability score + штрафы за no-show.
- **Code Rooms** — collaborative Monaco+Yjs редактор для pair coding (до 6 участников, AI review).

### Геймификация
- **Arena** — дуэли 1v1 / 2v2 / ranked, speed-run режим, ELO рейтинг, лидерборды.
- **Guild** — гильдии: членство, зал, челленджи, планируется Guild War (killer feature).
- **Season Pass** — 50 tiers free + premium, cosmetic награды (banners, blocks, pets, auras).
- **Shop** — таверна: золото/самоцветы/души, каталог косметики, инвентарь.
- **Streak** — дневные серии, shields, weekly pacts.
- **Missions** — дневные миссии с наградами.
- **Achievements / Activity Feed** — на профиле.
- **Friend Challenges** — send/accept/history дуэлей с друзьями.
- **Duel Replay** — запись и воспроизведение матчей.
- **Daily Challenge / Weekly Boss** — боссы недели, speed-run records.

### Соц
- **Friends** — add/accept/decline/remove + список онлайн.
- **Inbox** — личные сообщения (threads).
- **Notifications** — Telegram push + in-app bell (friend_request, duel_challenge, guild_invite и т.п.).
- **Community Map** — MapLibre карта пользователей и событий (world pins).
- **Events** — игровые события с регистрацией.
- **Podcasts** — загрузка и стриминг mp3 с chunked upload.
- **Referral** — реферальная система.

### Admin
- `/admin` dashboard (pixel theme, 8 секций).
- Admin pages: analytics, code-game tasks, interview-prep CRUD, RT-config, user management, shop/seasonpass/ai-bots/notifications/podcasts (в процессе — Wave E).

## Конвенции

- **Proto-first** для любого нового RPC. Правим `.proto`, запускаем `cd apps/api && make api`, потом пишем handler/service/repo.
- **Clean architecture** на беке: `apps/api/internal/api/<domain>/{handler,service,repo}`.
- **UUID парсинг** — `apihelpers.ParseUUID(req.Id, "INVALID_FOO", "foo_id")` возвращает 401 на пустую строку.
- **Миграции** — `apps/api/scripts/migrations/NNNNN_name.sql` в goose-формате, применяются автоматически при старте контейнера.
- **API response keys** — всегда camelCase (grpc-gateway). snake_case в фронте — баг.
- **i18n** — `apps/front/src/shared/i18n/locales/{en,ru}/translation.json`.
- **SVG assets** — рисуются вручную в 2D pixel-стиле (см. `shared/ui/pixel/`).

## Команды

```bash
# Бек
cd apps/api && make api          # regenerate proto stubs
cd apps/api && go build ./...    # сборка
cd apps/api && make test         # тесты

# Фронт
cd apps/front && npx tsc --noEmit  # type-check (pnpm build НЕ запускаем — юзер verify'ит на stg)

# Логи staging
docker logs --tail=200 druz9-backend-1 2>&1 | grep -iE "ERROR"
```

## Workflow

- Push сразу в `master`, без PR и feature-веток.
- Staging verify делает пользователь сам (druz9.online).
- Коммит-сообщения: `[TICKET-ID] <type>: <scope>` (тип: fix/feat/chore/refactor).

## Дополнительные доки

- [BACKEND.md](BACKEND.md) — домены, RPC, таблицы, миграции.
- [FRONTEND.md](FRONTEND.md) — страницы, фичи, роутер, дизайн-система.
