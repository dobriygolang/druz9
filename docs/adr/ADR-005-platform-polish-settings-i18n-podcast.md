# ADR-005: Platform Polish — Settings, i18n, Notifications, Global Podcast Player

**Status:** Proposed
**Date:** 2026-04-19
**Scope:** issues #15, #16
**Related code:**
- `apps/front/src/pages/SettingsPage/ui/SettingsPage.tsx`
- `apps/front/src/shared/i18n/index.ts` (+ `locales/{ru,en}/translation.json`)
- `apps/api/internal/api/notification/{get,update}_notification_settings.go`
- `apps/api/api/social/notification/v1/notification.proto`
- `apps/front/src/pages/PodcastsPage/ui/PodcastsPage.tsx`
- `apps/front/src/features/Podcast/{api/podcastApi.ts,providers/AudioPlayerProvider.tsx,ui/AudioPlayerBar.tsx}`
- `apps/api/api/social/podcast/v1/podcast.proto`
- `apps/front/src/widgets/PageLayout/ui/PageLayout.tsx`

---

## Context

### Settings
- На фронте `LANGS` массив из 8 языков (ru/en/de/fr/es/zh/ja/pt), но переводы есть только для **ru, en**. Остальные при выборе ломают UI.
- `Layout density` toggle есть в UI, но никуда не сохраняется (нет поля в `user_settings`).
- `Notifications` — handler `GetNotificationSettings` **paniks** (`apps/api/internal/api/notification/get_notification_settings.go:13` — `panic("not implemented")`). Тоесть UI читает 500 и фоллбекается.

### Notifications backend
- Proto есть, поля корректные (`duelsEnabled`, `progressEnabled`, `guildsEnabled`, `dailyChallengeEnabled`, quiet hours, telegram link).
- Отдельный `notification-service` — gRPC, доставка через Telegram-бота.
- Нет WebSocket для in-app live notifications.

### Podcast
- Плеер есть (`AudioPlayerProvider`), seek/speed работают.
- Вкладки **Featured / Series / History / Saved**:
  - Featured — приходит с бека.
  - Series — на фронте удалена (ставится фейк).
  - History — localStorage.
  - Saved — localStorage.
- Не понятно, как админ помечает подкаст как Featured и как создать Series.
- `AudioPlayerBar` рендерится **только** на `/podcasts` (условие `location.pathname === '/podcasts'`), хотя `AudioPlayerProvider` обёрнут глобально — то есть state живёт, а UI исчезает при уходе со страницы.

## Decision

1. **i18n**: схлопнуть `LANGS` до того, что реально поддержано (ru, en). Расширение списка — только при добавлении файла локали (lint-проверка в CI).
2. **Settings**: реализовать `GetNotificationSettings` (сейчас падает), добавить поле `layout_density` (`compact|comfortable`) в `user_settings`, привязать UI.
3. **Podcasts admin model**: явные понятия `Series` (коллекция) и `Featured` (флаг или editorial-list). Featured управляется только админом; Series — админом, эпизоды линкуются на series.
4. **Plyer mini-bar**: вынести в `PageLayout` глобально, со свернутым/развернутым состоянием. State уже глобальный (Provider обёрнут вокруг RouterProvider).
5. **Notifications live channel**: НЕ в этом ADR. Telegram-доставка достаточна для MVP, in-app live — отдельная задача (отметить).

## Options Considered

### i18n языковой список

#### Option A: Source of truth — directory listing (рекомендуется)
`LANGS` = `await import.meta.glob('./locales/*/translation.json')`. Всё, что лежит — то и в селекторе. CI проверяет, что новые ключи добавлены во все языки.

#### Option B: Hardcoded `LANGS` + ручная синхронизация
**Cons:** уже привело к бажному UI с 8 языками без переводов.

**Берём A.**

### Layout density storage

#### Option A: Поле в `user_settings` (рекомендуется)
Persisted, синхронизируется между устройствами.

#### Option B: localStorage
**Pros:** zero backend. **Cons:** не переносится между устройствами; пользователь жалуется именно на «не работает», то есть ожидает persistence.

**Берём A.**

### Podcast Series

#### Option A: `series` отдельная сущность (1:N эпизоды) (рекомендуется)
Чистая модель, фильтры тривиальны.

#### Option B: `series_slug` поле в podcast
**Pros:** одна миграция. **Cons:** нет места под обложку/описание серии, дубликаты.

**Берём A.**

### Featured

`featured_at TIMESTAMPTZ NULL` поле + индекс. Сортировка `ORDER BY featured_at DESC NULLS LAST`. Простая editorial-кнопка в админке «сделать Featured» — пишет `now()`. Удаление — `NULL`.

## Data model

```sql
-- migration 00029_user_settings_layout.sql
ALTER TABLE user_settings
  ADD COLUMN layout_density TEXT NOT NULL DEFAULT 'comfortable'
    CHECK (layout_density IN ('compact','comfortable'));

-- migration 00030_podcast_series.sql
CREATE TABLE podcast_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE podcasts
  ADD COLUMN series_id UUID REFERENCES podcast_series(id) ON DELETE SET NULL,
  ADD COLUMN episode_number INT,
  ADD COLUMN featured_at TIMESTAMPTZ;
CREATE INDEX ON podcasts (featured_at DESC NULLS LAST);
CREATE INDEX ON podcasts (series_id, episode_number);
```

## Action Items

### Backend
1. [ ] Реализовать `GetNotificationSettings` — убрать panic, читать из `user_notification_settings` таблицы (создать миграцию `00031_notification_settings.sql` если ещё нет).
2. [ ] Migration `00029_user_settings_layout.sql`.
3. [ ] Proto `apps/api/api/core/profile/v1/settings.proto` — добавить `LayoutDensity` enum, `GetUserSettings`/`UpdateUserSettings` (если нет).
4. [ ] Migration `00030_podcast_series.sql`.
5. [ ] Proto `apps/api/api/social/podcast/v1/podcast.proto`:
   - `Series { id, slug, title, description, cover_ref, episode_count }`
   - `ListSeries`, `GetSeries(id|slug) returns SeriesWithEpisodes`
   - `AdminCreateSeries`, `AdminUpdateSeries`, `AdminAttachToSeries(podcast_id, series_id, episode_number)`
   - `AdminToggleFeatured(podcast_id, featured bool)`
6. [ ] Handler `apps/api/internal/api/podcast/series.go` + admin endpoints.
7. [ ] `ListPodcasts` — добавить filter `?series_id=&featured=true`.
8. [ ] Mockery + tests.

### Frontend
9. [ ] `apps/front/src/shared/i18n/index.ts` — `LANGS` строится из `import.meta.glob('./locales/*/translation.json')`.
10. [ ] `apps/front/src/pages/SettingsPage/ui/SettingsPage.tsx` — удалить hardcoded LANGS, читать из i18n util. Layout density привязать к `userSettingsApi`.
11. [ ] `apps/front/src/features/UserSettings/api/` — новая фича для get/update settings (если нет).
12. [ ] CSS-переменная `--density-scale` (`1` для comfortable, `0.85` для compact) — применять к paddings/gaps в `globals.css`.
13. [ ] `apps/front/src/widgets/PageLayout/ui/PageLayout.tsx:103` — рендерить `<AudioPlayerBar />` всегда (после Outlet, перед overlays). В самом баре — условие `if (!currentEpisode) return null`.
14. [ ] `AudioPlayerBar` — добавить compact/expanded режим (компакт = 60px высоты с play/pause/seek, expanded = текущий вид). При скролле страницы остаётся внизу.
15. [ ] `PodcastsPage`:
   - Tab `Featured` — `?featured=true`.
   - Tab `Series` — `ListSeries()` + click → детальная страница серии.
   - Tab `History` — оставить localStorage (это персональная история прослушивания).
   - Tab `Saved` — мигрировать в бек: новая таблица `user_saved_podcasts`. Это позволит синхронизировать между устройствами.
16. [ ] Admin UI — формы Series CRUD + кнопка «Make Featured» в списке подкастов.

### Tests
17. [ ] E2E: запустить эпизод на `/podcasts`, перейти на `/hub` — плеер виден, играет, можно поставить на паузу.
18. [ ] CI lint: ключи в `ru/translation.json` ≡ ключи в `en/translation.json` (используется уже существующий `i18next-parser` или `eslint-plugin-i18n-keys`).

## Trade-offs

- **Series как отдельная таблица** — чуть больше кода, но открывает добавление обложек серий, описаний, отдельной аналитики. Без неё через год придётся всё равно делать.
- **Featured как timestamp** — удобнее editorial-flow («поставить на главную ровно сейчас, через 7 дней снять автоматически» легко добавить).
- **Saved в БД** — теряем zero-backend-cost localStorage, но получаем cross-device sync, чего пользователь ждёт по умолчанию.

## Consequences

**Easier:** добавление нового языка (бросить файл — попадает в селектор), запуск promo-серий подкастов.
**Harder:** в админке появляются новые формы — нужны права (только staff).
**Revisit:** in-app live notifications (WebSocket) — отдельный ADR, когда понадобится.

## Out of scope (отдельные задачи)

- In-app realtime notifications (сейчас только Telegram).
- Keybindings / Privacy / Accessibility tabs в Settings — пользователь подтвердил, что они уже удалены, не возвращаем.
- Полный i18n для admin-панели.

## Definition of Done

- [ ] `/settings` — селектор языка показывает только реально доступные локали.
- [ ] Layout density переключается и сохраняется между сессиями.
- [ ] `GetNotificationSettings` возвращает данные, не падает.
- [ ] На любой странице, начав слушать подкаст, плеер остаётся виден внизу.
- [ ] Admin может создать Series, привязать эпизоды, отметить подкаст как Featured.
