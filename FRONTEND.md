# druz9 — Frontend Architecture

> Vite + React 18 + TypeScript. Feature-Sliced Design light. Pixel RPG дизайн-система.

## Layout (FSD-like)

```
apps/front/src/
  pages/           # роут-уровневые компоненты (каждая — отдельный роут)
  features/        # логические фичи (api + hooks + ui)
  widgets/         # layout-компоненты (sidebar, header, overlays)
  shared/
    ui/
      pixel/       # дизайн-система: PageHeader, RPGPanel, PixelButton, …
      sprites/     # SVG-ассеты 2D pixel-style (characters, cosmetics)
    api/base.ts    # axios-клиент + auth interceptor
    i18n/          # ru + en locales
    lib/           # monacoTextBinding, utils
    stores/        # zustand stores (useAuth, useLiveStats, useTweaks)
```

## Роуты и страницы

| Route | Page | Назначение |
|---|---|---|
| `/` | HubPage | главная: daily pact, quest, stats |
| `/atlas` | TrainingPage/SkillsPage | древо навыков (PoE-style) |
| `/training/:taskId` | TrainingTaskPage | решение training-задачи |
| `/profile` | ProfilePage | профиль + achievements + activity + inventory cosmetics |
| `/guild` | GuildPage | зал гильдии / онбординг вступления |
| `/guild/war` | GuildWarPage | Guild War (в разработке) |
| `/arena` | ArenaHubPage | hub дуэлей + лидерборды + история |
| `/arena/match/:id` | ArenaMatchPage | активный матч |
| `/duel/:id` | DuelLivePage | live дуэль 1v1 |
| `/duel/:id/replay` | DuelReplayPage | воспроизведение |
| `/daily-challenge` | DailyChallengePage | daily challenge |
| `/friend-challenges` | FriendChallengesPage | список входящих/отправленных |
| `/leaderboards` | LeaderboardsPage | все лидерборды |
| `/interview` | InterviewHubPage | hub интервью: company chips, AI, mocks |
| `/interview/live/:sessionId` | InterviewLiveSessionPage | AI chat-интервью |
| `/interview/prep/:sessionId` | InterviewPrepSessionPage | AI session с секциями |
| `/interview/mock/:sessionId` | InterviewPrepMockSessionPage | mock с AI-оценкой per section |
| `/interview/peer` | PeerMocksPage | P2P собесы: слоты + мои брони + мои слоты |
| `/events` | EventsPage | игровые события |
| `/podcasts` | PodcastsPage | featured/series/history + плеер + upload |
| `/season-pass` | SeasonPassPage | 50 tiers ladder |
| `/shop` | ShopPage | таверна |
| `/inbox` | InboxPage | личные сообщения |
| `/map` | MapPage | MapLibre карта пользователей/событий |
| `/speed-run` | SpeedRunPage | speed-run records |
| `/weekly-boss` | WeeklyBossPage | weekly boss |
| `/blind-review` | BlindReviewPage | blind code review |
| `/code-rooms` | CodeRoomsIndexPage | список комнат |
| `/code-rooms/:id` | CodeRoomPage | collaborative Monaco+Yjs (full-screen, без PageLayout) |
| `/settings` | SettingsPage | notifications + tweaks (dev experiments) |
| `/design-system` | DesignSystemPage | каталог UI |
| `/login` | LoginPage | Telegram/Yandex auth |
| `/auth/callback` | AuthCallbackPage | OAuth callback |
| `/complete-registration` | CompleteRegistrationPage | finish onboarding |
| `/admin` | AdminDashboardPage | admin hub (8 секций) |
| `/admin/analytics` | AdminAnalyticsPage | метрики |
| `/admin/code-game` | AdminCodeGamePage | CRUD code-editor tasks |
| `/admin/interview-prep` | InterviewPrepAdminPage | CRUD mock blueprints/pools/questions |
| `/admin/code-tasks` | CodeTasksAdminPage | CRUD training tasks |
| `/admin/rtconfig` | RTConfigAdminPage | runtime config |
| `/admin/shop` | *(Wave E.1)* | CRUD shop items |
| `/admin/seasonpass` | *(Wave E.2)* | tier ladder editor |
| `/admin/ai-bots` | *(Wave E.3)* | AI mentors CRUD |
| `/admin/notifications` | *(Wave E.4)* | broadcast форма |
| `/admin/podcasts` | *(Wave E.5)* | подкаст список + upload link |

## Фичи (`src/features/`)

Каждая фича содержит `api/` (fetchers), `hooks/`, `ui/` (компоненты специфичные для фичи).

- **Admin** — helpers для admin-gated views.
- **Arena** — enterDuel, leaderboards fetch, match subscribers.
- **Auth** — `useAuth`, login/logout flow.
- **CodeRoom** — `useCodeRoomWs` (WebSocket + Yjs binding), peer cursors, AI review trigger.
- **Community** — friends online, pins карты.
- **DuelReplay** — replay player state machine.
- **Event** — events list/subscribe.
- **FriendChallenge** — send/accept/decline fetchers.
- **Geo** — resolve + world pins.
- **Guild** — membership, hall customization.
- **Hub** — daily pact, quest.
- **Inbox** — threads, messages.
- **InterviewPrep** — companies, blueprints, mock sessions, AI chat.
- **Journey** — user progress trail.
- **Mission** — daily missions list.
- **Notification** — bell state, mark-read.
- **PeerMock** — слоты, бронь, reliability, create-slot модалка.
- **Podcast** — list, play, upload (chunked presigned PUT).
- **Referral** — мои рефералки.
- **SeasonPass** — tier ladder rendering.
- **Shop** — каталог, инвентарь, purchase.
- **Skills** — древо Atlas.
- **Social** — friends CRUD.
- **SolutionReview** — AI review display.
- **Streak** — streak state, shields.
- **Training** — task fetch + evaluate.

## Widgets (`src/widgets/`)

- **PageLayout** — шапка + sidebar + main (дефолтный layout).
- **AdminLayout** — layout для `/admin/*` с AdminSidebar.
- **Sidebar** — главное меню (без админки).
- **AdminSidebar** — 8 секций админки.
- **HeroStrip** — gold/gems/souls счётчики + lvl/xp (pixel).
- **Onboarding** — flow для новых юзеров.
- **Overlays** — NotificationBell, NotificationsPanel, TweaksPanel (в Settings), модалки.

## Shared UI (`src/shared/ui/pixel/`)

- **PageHeader** — заголовок страницы в pixel стиле (title + level/xp/currency).
- **RPGPanel** — .rpg-panel обёртка (рамка с углами).
- **PixelButton / PixelCard / PixelTabs** — базовые контролы.
- **Sprites** — `characters.tsx` (Hero), cosmetic overlays.
- **Assets** — `assets/season-pass/` SVG-иконки наград (items/blocks/pets/effects).

## Stores (Zustand)

- **useAuth** — user state, token, методы login/logout.
- **useLiveStats** — gold/gems/souls/xp/level в реальном времени (обновляется по WS).
- **useTweaks** — developer tweaks (density, experimental features).

## Конвенции

- **API responses — camelCase** (grpc-gateway). snake_case во фронте = баг.
- **API клиент** — `shared/api/base.ts`. Перед fetch'ем которые требуют user.id, guard'ить: `if (!user?.id) return`.
- **i18n** — все строки через `useTranslation()`. Русский первичный язык.
- **Роутер** — react-router v6. `/code-rooms/:id` монтируется вне PageLayout (full-screen).
- **WebSocket** — `features/CodeRoom/hooks/useCodeRoomWs.ts` паттерн: `attachBinding()` безусловно на маунте.
- **Design system** — pixel RPG: использовать `pixel/*` компоненты, избегать raw div'ов с кастомными border'ами.

## Build

```bash
cd apps/front && npx tsc --noEmit   # type-check
# pnpm build НЕ запускаем локально — юзер verify'ит на stg
```
