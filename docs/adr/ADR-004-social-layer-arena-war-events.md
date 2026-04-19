# ADR-004: Social Layer — Arena 2v2, Guild War, Events, Onboarding

**Status:** Proposed
**Date:** 2026-04-19
**Scope:** issues #7, #11
**Related code:**
- `apps/api/api/game/arena/v1/arena.proto`
- `apps/api/internal/api/arena/{matchmaker,submit_code}.go`
- `apps/api/internal/realtime/arena/hub.go` (WebSocket уже есть)
- `apps/api/internal/api/guild/war_actions.go`
- `apps/api/internal/data/guild/war.go`
- `apps/api/cmd/api/guild_war_worker.go` (cron)
- `apps/api/api/social/event/v1/event.proto`
- `apps/front/src/pages/{ArenaHubPage,ArenaMatchPage,GuildWarPage,EventsPage}/`

---

## Context

### Arena
- 1v1 (ranked/casual) — полностью работает: matchmaking → WebSocket-hub → submit code → результат.
- **2v2 (`team_2v2`)** — режим **объявлен в proto** (`arena.proto:113`), но handler/queue/UI отсутствуют. На фронте placeholder «invite friend» без API.
- **Guild battle** — не упоминается нигде в коде.

### Guild War
- Cron уже гоняет фазы (Mon→Wed→Sat→Sun): draft → active → champions_duel → resolved + territory awards.
- `ContributeToFront()` RPC работает, фронты учитываются.
- **Live broadcast отсутствует**: фронт пуллит `GetGuildWar()` REST'ом. Нет WebSocket для live-фида ходов.

### Events
- Полноценный CRUD есть, есть scope `is_public` + `guildId`, есть модерация (`PENDING/APPROVED/REJECTED`).
- На фронте `EventsPage` есть, eventApi есть.
- **Не хватает**: явного UX «создать ивент только для своей гильдии», явного запрета смотреть чужие приватные ивенты, broadcasting войны как auto-event в фид гильдии.

### Onboarding
- Никаких tooltip/tour-компонентов в проекте нет.
- Игрок заходит в Arena/War/Events и не понимает, какой режим что значит.

## Decision

1. **Arena 2v2**: реализовать через ту же matchmaking/WebSocket-инфраструктуру, что и 1v1 — добавить `Team` сущность (ad-hoc party из 2 человек) и расширить `MatchmakerQueue` ключом `mode+team_size`.
2. **Guild battle (внутри арены)** — вынести **за рамки** этого ADR. Это другая механика (per-guild, не realtime). Заменяется механикой Guild War, которая уже есть.
3. **Guild War live**: расширить существующий `realtime/` пакет новым hub'ом `realtime/guildwar/hub.go`. Фронт подписывается на `ws://.../guild-war/{warId}` и получает события `front_contribution`, `phase_transition`, `mvp_changed`.
4. **Events**: добавить семантический scope `EVENT_VISIBILITY_GUILD_ONLY` (отдельно от `is_public`), запретить листинг чужих guild-only. Создание war автоматически инсертит system-event в фид обеих гильдий.
5. **Live в Hub**: блок «Активная война» в `/hub` подписывается на тот же `guildwar/ws` если у юзера активна война.
6. **Onboarding**: лёгкий tour-движок на `driver.js` или `react-joyride` (выбор ниже). Триггерится при первом визите страницы — флаг в `user_progress.tours_completed[]` на беке.

## Options Considered

### Arena 2v2: party-формирование

#### Option A: Lobby-based (рекомендуется)
Юзер создаёт «лобби» (2 слота), даёт ссылку, второй джойнится, оба нажимают «в очередь», matchmaker ищет другую пару такого же ELO.

| Dim | Assessment |
|---|---|
| Complexity | Medium — нужна Lobby модель + invite link |
| UX | Familiar (как dota/csgo) |
| Backend | +`arena_lobbies` table, +1 RPC |

#### Option B: Solo-queue 2v2 (random teammate)
Один игрок жмёт «2v2», matchmaker сам собирает 4 игрока.

**Pros:** ноль friction. **Cons:** для соревновательного кода с другим человеком нужна координация — random teammate портит опыт. Подходит как **второй** режим, не первый.

**Берём A первым, B потом** (после метрики waiting time).

### Live broadcast

#### Option A: WebSocket per-resource (рекомендуется)
Новый hub `realtime/guildwar/hub.go`. Стандартный paттерн — уже доказан на arena. Хорошо масштабируется (sticky-session или Redis pub/sub при горизонтальном масштабе).

#### Option B: Server-Sent Events
**Pros:** проще через CDN/прокси. **Cons:** в проекте `gorilla/websocket` уже стандарт, ENV `SSE` лежит неиспользованным — добавлять второй стек неоправданно.

**Берём A.**

### Onboarding

#### Option A: `react-joyride` (рекомендуется)
~30KB, поддерживает условные шаги, контроль через redux/zustand state, accessible.

#### Option B: `driver.js`
Меньше (15KB), но менее гибкая интеграция с React.

#### Option C: своё на CSS portals
**Cons:** время разработки 2x.

**Берём A.**

## Data model

```sql
-- migration 00026_arena_2v2.sql
CREATE TABLE arena_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL,                   -- 'team_2v2'
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',  -- open|queued|matched|expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 min'
);
CREATE TABLE arena_lobby_members (
  lobby_id UUID NOT NULL REFERENCES arena_lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lobby_id, user_id)
);
CREATE INDEX ON arena_lobbies (status, mode) WHERE status='queued';

-- migration 00027_event_visibility.sql
ALTER TABLE events
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','guild_only','private'));
ALTER TABLE events
  ADD COLUMN system_kind TEXT;  -- 'guild_war_started' и т.п. — не показывать в обычном UI

-- migration 00028_user_tours.sql
ALTER TABLE user_progress
  ADD COLUMN tours_completed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
```

## Live broadcast contract

```
ws://api/v1/realtime/guildwar/{warId}?token=...

Server → Client events:
{ "type": "snapshot",          "war": {...} }      // initial
{ "type": "front_contribution","frontId":"...","userId":"...","value":42 }
{ "type": "phase_transition", "fromPhase":"draft","toPhase":"active","at":"..." }
{ "type": "mvp_changed",      "userId":"...","metric":"contributions","value":1234 }
{ "type": "feed",             "entry":{...} }     // обёртка над GuildWarFeed
```

Auth: same как arena (JWT в query или Sec-WebSocket-Protocol).

## Action Items

### Backend — Arena 2v2
1. [ ] Migration `00026_arena_2v2.sql`.
2. [ ] Proto `arena.proto`: `CreateLobby`, `JoinLobby(invite_code)`, `LeaveLobby`, `EnqueueLobby` RPC + сообщения.
3. [ ] `apps/api/internal/api/arena/lobby.go` — CRUD lobby.
4. [ ] `apps/api/internal/api/arena/matchmaker.go` — расширить очередь: ключ `(mode, elo_bucket)`, для `team_2v2` парует две лобби. На матч создаёт две `ArenaPlayer` строки на команду.
5. [ ] WebSocket `realtime/arena/hub.go` — поддержать команду из 2 игроков (broadcast снапшота всем 4 + spectators).

### Backend — Guild War live
6. [ ] `apps/api/internal/realtime/guildwar/hub.go` — новый WS hub. На каждом `ContributeToFront`/cron-transition пушит событие.
7. [ ] Гейтвей: при `MarkStaleWarsResolved` / `TransitionWarPhase` / `ResolveWarsAndAwardTerritories` — публиковать в hub.

### Backend — Events
8. [ ] Migration `00027_event_visibility.sql`.
9. [ ] Proto `event.proto` — добавить `EventVisibility` enum (PUBLIC/GUILD_ONLY/PRIVATE) + `system_kind`.
10. [ ] `ListEvents` — фильтр в SQL: `WHERE visibility='public' OR (visibility='guild_only' AND guild_id IN <my_guilds>)`.
11. [ ] При создании Guild War (cron) — инсертить system-event `kind=guild_war_started` в feed обеих гильдий, `visibility=guild_only`.

### Backend — Onboarding
12. [ ] Migration `00028_user_tours.sql`.
13. [ ] Proto `profile.proto` — `MarkTourCompleted(tour_id)` RPC, `tours_completed` в `Profile`.

### Frontend
14. [ ] `apps/front/src/pages/ArenaHubPage` — карточка «2v2 Командная дуэль» → `/arena/lobby/new?mode=team_2v2`.
15. [ ] `apps/front/src/pages/ArenaLobbyPage` (новая) — создание/джойн лобби, copy invite link, кнопка «В очередь».
16. [ ] `apps/front/src/pages/ArenaMatchPage` — поддержать рендер 2v2 (4 кода в split-view 2x2).
17. [ ] `apps/front/src/features/GuildWar/hooks/useGuildWarWs.ts` — новый WS-хук (по образцу `useArenaWs.ts`).
18. [ ] `GuildWarPage` — переключиться с polling на WS.
19. [ ] `HubPage` — блок «Активная война» подписывается на тот же WS.
20. [ ] `EventsPage` — селектор visibility при создании, фильтры на отображении.
21. [ ] Установить `react-joyride`.
22. [ ] `apps/front/src/features/Tour/` — обёртка вокруг joyride + интеграция с `MarkTourCompleted`. Туры: `arena_intro`, `war_intro`, `events_intro`, `hub_intro`.
23. [ ] Триггер тура при первом визите страницы, если `tour_id ∉ user.tours_completed`.

### Tests
24. [ ] Mockery для lobby/matchmaker. Table-driven: пара лобби той же ELO → match создан.
25. [ ] Integration test полного guild-war цикла с WS-клиентом.

## Trade-offs

- **2v2 lobby vs solo-queue**: lobby решает координационную проблему, но требует больше клика. Принимаем — 2v2 без партии для интервью-кодинга бессмысленно.
- **WebSocket vs SSE для war**: WS сложнее в инфре (sticky), но проект уже на WS. Не ломаем стек.
- **System-events в общей таблице** vs отдельная `feed` таблица: общая упрощает ленту, фильтр `system_kind IS NULL` для обычного UI. Если станет шумно — вынесем.

## Consequences

**Easier:** добавлять новые арена-режимы (3v3, async puzzle), новые типы system-events.
**Harder:** нагрузка на WS — нужно мониторить connections per pod, при росте — Redis pub/sub.
**Revisit:** ELO-формула для 2v2 (team-MMR vs avg) — после первой недели данных.

## Definition of Done

- [ ] Два игрока могут создать лобби, пригласить ещё двух (соперников), сыграть 2v2 матч.
- [ ] При взносе в фронт войны второй игрок гильдии видит обновление **без перезагрузки**.
- [ ] При начале guild war обе гильдии видят системный ивент в `EventsPage`.
- [ ] Новый юзер на `/arena` видит туториал, после прохождения — больше не видит.
