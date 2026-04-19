# ADR-003: Customization & Guilds — Hero Room, Cosmetics, Guild Hall, Permissions

**Status:** Proposed
**Date:** 2026-04-19
**Scope:** issues #6, #9 (блокер прода)
**Related code:**
- `apps/front/src/pages/ProfilePage/ui/ProfilePage.tsx`
- `apps/front/src/pages/GuildPage/ui/GuildPage.tsx`
- `apps/api/api/core/profile/v1/profile.proto`
- `apps/api/api/social/guild/v1/guild.proto`
- `apps/api/internal/api/{profile,guild}/`
- `apps/api/internal/api/profile/achievements.go` (статический каталог)
- `apps/api/scripts/migrations/{00006_gamification,00014_cosmetic_catalog_seed,00015_cosmetic_slots}.sql`

---

## Context

**Cosmetics на беке готовы:** есть `shop_items` (slots: pose/pet/room/ambience/head/body/back/aura/frame), `user_shop_inventory.equipped`, `EquipCosmetic` RPC. Каталог сидится миграцией 00014.

**Profile-фронт хардкодит:**
- `buildCosmetics(t)` — статический список «надетой косметики» вместо `GET /api/v1/profile/equipped`.
- `buildAchievements(t)` — fallback демо-данные.
- Pinned achievements показывают незавершённые (`progress < 100`) — это проявление того, что фронт берёт каталог, а не серверное состояние `user.pinned_achievements[]`.

**Hero Room composition system отсутствует.** Пользователь хочет drag-and-drop сцену с возможностью двигать/масштабировать предметы. На беке нет моделей `room_layout`, `placed_item.{x,y,scale,rotation,z}`.

**Guild:**
- Роли `CREATOR | OFFICER | MEMBER` — есть в proto и в `guild_members.role`.
- `UpdateGuildSettings` уже допускает CREATOR + OFFICER. Хорошо.
- Хардкод на `GuildPage.tsx`: `GUILD_ACHIEVEMENTS`, `HALL_ITEMS`, `CAMPAIGN_REWARDS`, `HALL_COLORS`. Ничто не приходит с бека.
- Нет понятия «дизайн зала гильдии» (нет `guild_hall_layout`).
- `druz9_features.md` Wave 1: **Profile Scene Builder** + **Guild Hall Customization** — top priority.

## Decision

1. **Единый Composition Engine** для Hero Room и Guild Hall — общая модель `scene_layout` + общий React-компонент `<SceneEditor>`. Не делать два разных движка.
2. **Permissions для Guild Hall**: редактировать может CREATOR и OFFICER. Расширения ролей (Recruiter/Mentor/War Captain — из feature backlog) — в **отдельном следующем ADR**, не блокируем прод.
3. **Pinned achievements**: фронт обязан читать `user.pinned_achievements[]` от бека, фильтр `progress=100` — на беке (`ListProfileAchievements` возвращает `pinned: bool` поле).
4. **Шоп интеграция**: косметика уже есть, никаких новых таблиц не нужно — только связать UI-equip-flow с бекендом.

## Options Considered (Composition Engine)

### Option A: react-dnd + own renderer (рекомендуется)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Bundle size | ~25KB |
| Mobile support | Required — нужен `react-dnd-touch-backend` |
| Customization | Full control over UX (snap-to-grid, magnetic edges) |

**Pros:** контроль, простая модель данных, полный контроль над persistence.
**Cons:** придётся писать ресайз/ротейт самим (~2 дня).

### Option B: tldraw / dnd-kit + custom items
**Pros:** богаче из коробки. **Cons:** tldraw — это full whiteboard editor, оверкил; bundle 200KB+.

### Option C: WYSIWYG через CSS Grid + free placement через `position: absolute`
**Pros:** ноль зависимостей. **Cons:** ручная разработка drag/resize/rotate handlers — больше кода чем react-dnd.

**Берём A**, оборачиваем в свой `<SceneEditor>` API чтобы Hero Room и Guild Hall использовали одно и то же.

## Data model

```sql
-- migration 00024_scene_layouts.sql
CREATE TABLE scene_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('user_room','guild_hall')),
  owner_id UUID NOT NULL,                -- user_id или guild_id
  width INT NOT NULL DEFAULT 1200,
  height INT NOT NULL DEFAULT 800,
  background_ref TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,              -- audit
  UNIQUE (scope, owner_id)
);

CREATE TABLE scene_placed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES scene_layouts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id),  -- что положили
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  scale DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  rotation_deg DOUBLE PRECISION NOT NULL DEFAULT 0,
  z_index INT NOT NULL DEFAULT 0,
  flipped BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ON scene_placed_items (layout_id);
```

**Ownership invariant:** при сохранении сервер проверяет, что каждый `item_id` принадлежит юзеру (для user_room) или гильдии (для guild_hall — отдельная таблица `guild_inventory`, см. ниже).

## Guild Inventory

Сейчас гильдия не владеет предметами. Добавить:
```sql
CREATE TABLE guild_inventory (
  guild_id UUID NOT NULL,
  item_id  UUID NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, item_id)
);
```
Покупка из shop с `category=guild_decor` идёт на гильдию (только CREATOR/OFFICER могут тратить guild bank).

## Permissions matrix

| Action | CREATOR | OFFICER | MEMBER |
|---|---|---|---|
| Edit `guild_hall` layout | ✅ | ✅ | ❌ |
| Buy items into `guild_inventory` (spend bank) | ✅ | ✅ | ❌ |
| Donate item to guild (own → bank) | ✅ | ✅ | ✅ |
| Update guild settings | ✅ | ✅ | ❌ (текущее) |
| Set member role | ✅ | ❌ | ❌ (текущее) |
| Eject member | ✅ | ✅ (только MEMBER, не OFFICER) | ❌ |

Реализовать в `apps/api/internal/api/guild/permissions.go` как pure-функцию `Can(role, action) bool`. Все handlers зовут её, а не дублируют if-ы.

## Pinned Achievements fix

Текущее поведение: фронт берёт `user.pinned_achievements[]` (массив ID) и матчит со статическим каталогом — поэтому показываются и незавершённые, и фронт сам решает что показывать.

Решение:
- `apps/api/internal/api/profile/achievements.go` — `ListProfileAchievements` уже считает progress. Добавить filter param `pinned_only=true` и server-side проверку: можно пинать **только** `progress=100`. При попытке pin незавершённого — `400 achievement_not_earned`.
- На фронте удалить fallback-каталог.
- Если pinned_achievement стал недоступен (например, миграция изменила ID) — silent skip, не показываем.

## Action Items

### Backend
1. [ ] Migration `00024_scene_layouts.sql` (см. выше) + `00025_guild_inventory.sql`.
2. [ ] Proto `apps/api/api/core/profile/v1/scene.proto` (новый):
   ```proto
   service SceneService {
     rpc GetUserRoom(GetUserRoomRequest) returns (SceneLayout);
     rpc UpdateUserRoom(UpdateUserRoomRequest) returns (SceneLayout);
     rpc GetGuildHall(GetGuildHallRequest) returns (SceneLayout);
     rpc UpdateGuildHall(UpdateGuildHallRequest) returns (SceneLayout);
   }
   message PlacedItem { string item_id=1; double x=2; double y=3; double scale=4; double rotation_deg=5; int32 z_index=6; bool flipped=7; }
   message SceneLayout { string id=1; int32 width=2; int32 height=3; string background_ref=4; repeated PlacedItem items=5; }
   ```
3. [ ] `apps/api/internal/api/scene/{user_room,guild_hall}.go` — handlers с проверкой ownership + permissions.
4. [ ] `apps/api/internal/api/guild/permissions.go` — `Can(role, action)`. Покрыть unit-тестами (table-driven).
5. [ ] Refactor существующих guild-handlers использовать `Can()`.
6. [ ] `apps/api/internal/api/profile/achievements.go` — `pinned_only` filter + валидация `progress=100` на pin.
7. [ ] Mockery + тесты для scene-service.

### Frontend
8. [ ] `apps/front/src/features/Scene/` — новая фича:
   - `api/sceneApi.ts` — get/update room/hall.
   - `ui/SceneEditor.tsx` — react-dnd canvas, snap-to-grid (16px), resize via corner handles, rotate via shift+drag.
   - `ui/SceneViewer.tsx` — read-only renderer (для просмотра чужой комнаты).
9. [ ] `ProfilePage.tsx` — заменить `buildCosmetics` на `<SceneViewer scope="user_room" ownerId={profileId}/>` + кнопка «Редактировать» (если профиль свой) → переход в `/profile/room/edit` с `<SceneEditor>`.
10. [ ] `ProfilePage.tsx` — `buildAchievements` удалить, потреблять `ListProfileAchievements({pinned_only:true})`.
11. [ ] `GuildPage.tsx` — заменить `HALL_ITEMS`/`CAMPAIGN_REWARDS`/`HALL_COLORS` на `<SceneViewer scope="guild_hall" ownerId={guildId}/>`. Кнопка редактирования видна, если `guild.myRole in ('CREATOR','OFFICER')`.
12. [ ] `guildApi.ts:46-49` — `normalizeGuildRole` распознавать также `OFFICER`.

### Rollout
13. [ ] При первом открытии Hero Room / Guild Hall без layout — создать пустой default (background = старый hardcoded asset).
14. [ ] Не выкатывать без E2E-теста: создать item → купить → положить в комнату → reload → виден.

## Trade-offs

- **Single SceneEditor для двух scope** упрощает поддержку, но требует чёткой permissions-проверки. Альтернатива (два разных редактора) — дублирование кода и UX-расхождения. Берём single.
- **Свой drag-and-drop вместо tldraw** — больше кода в краткосроке, лучше контроль и bundle.
- **Расширенные guild-роли (Recruiter и т.д.)** — отложены в отдельный ADR. Прод-блокер закрывается базовым CREATOR/OFFICER/MEMBER + permissions-функцией.

## Consequences

**Easier:** новые scope для редактора (например, «комната альянса» в будущем).
**Harder:** moderation — пользователь может выложить NSFW-композицию из cosmetics. Нужен report-flow (вне scope этого ADR, добавить tracking issue).
**Revisit:** если редактор станет популярным — миграция на server-rendered preview (Puppeteer/satori) для shareable cards.

## Definition of Done (для прода)

- [ ] Юзер может открыть свою Hero Room, перетащить купленный предмет, сохранить, перезайти и увидеть результат.
- [ ] Officer гильдии может редактировать Guild Hall, обычный member — нет (UI видит read-only).
- [ ] Pinned achievements показывают только заработанные.
- [ ] Нет хардкод-каталогов в `ProfilePage` и `GuildPage`.
