# druz9 — Backend Architecture

> Go + gRPC + grpc-gateway. Proto-first. Clean architecture. PostgreSQL через goose-миграции.

## Layout

```
apps/api/
  api/                                     # .proto files
    adapter/auth_callback/v1/              # внешние callback'и
    core/{admin,common,hub,profile}/v1/    # core домены
    game/{arena,challenge,duel_replay,
          friend_challenge,season_pass,
          shop,skills,streak}/v1/          # геймификация
    learning/{code_editor,interview_prep,
              mission,peer_mock,training}/v1/
    social/{event,geo,guild,inbox,
            notification,podcast,
            referral,social}/v1/
  internal/
    api/<domain>/                          # handler/service/repo
    realtime/codeeditor/                   # Yjs hub для code rooms
    apihelpers/                            # ParseUUID и общие утилиты
  scripts/
    migrations/NNNNN_*.sql                 # goose migrations
    seeds/*.sql                            # данные контента
```

## Домены и RPC

### core/profile — профиль + auth
- **Auth:** `CreateTelegramAuthChallenge`, `TelegramAuth`, `StartYandexAuth`, `YandexAuth`, `CompleteRegistration`, `Logout`, `BindTelegram`.
- **Profile:** `GetProfile`, `GetProfileByID`, `UpdateProfile`, `UpdateLocation`, `GetProfileProgress`, `SetUserGoal`, `GetReadiness`, `GetProfileFeed`.
- **Achievements/activity:** `ListProfileAchievements`, `ListProfileActivity`.
- **Wallet:** `GetWallet`.

### core/hub — hub страница
- `GetOverview` — daily pact + quest + stats.

### core/admin — админка core
- `DeleteUser`, `UpdateUserTrust`, `UpdateUserAdmin`, `GetConfig / ListConfig / UpdateConfig`, `GetRuntimeConfig`.

### game/arena — дуэли и лидерборды
- `CreateMatch`, `GetMatch`, `JoinMatch`, `LeaveMatch`, `SubmitCode`, `GetPlayerStats`.
- `GetLeaderboard`, `GuildsLeaderboard`, `SeasonXPLeaderboard`.
- `ReportAntiCheatEvent`.
- *Планируется (Wave B.3):* `EnqueueForMatch(mode)` + WS push + solo-timed fallback.

### game/challenge — weekly boss / blind review / speed run
- `GetWeeklyChallenge`, `GetBlindReviewTask`, `SubmitBlindReview`, `GetSpeedRunRecords`.

### game/duel_replay — запись и воспроизведение матчей
- `GetReplay`, `ListMyReplays`, `RecordEvent`.

### game/friend_challenge — дуэли с друзьями
- `ListIncoming`, `ListSent`, `ListHistory`, `SendChallenge`, `SubmitSolution`, `Decline`.

### game/season_pass — сезонный пропуск
- `GetActive`, `ClaimTierReward`, `PurchasePremium`.

### game/shop — таверна
- `ListCategories`, `ListItems`, `GetItem`, `GetInventory`, `Purchase`.
- *Планируется (Wave D):* `EquipCosmetic(itemId)`.
- *Планируется (Wave E.1):* `AdminCreateItem / AdminUpdateItem / AdminDeleteItem`.

### game/skills — древо навыков (Atlas)
- `GetSkillTree`, `GetSkillPoints`, `AllocateSkill`, `RefundSkill`.

### game/streak — серии и щиты
- `GetStreak`, `UseShield`, `PurchaseShield`.

### learning/code_editor — collaborative Monaco editor (code rooms)
- Комнаты: `CreateRoom`, `GetRoom`, `JoinRoom`, `JoinRoomByInviteCode`, `LeaveRoom`, `CloseRoom`, `UpdateRoom`, `StartRoom`, `ListRooms`.
- Execution: `SubmitCode`, `SetReady`, `AIReview`, `GetSolutionReview`.
- Tasks (admin): `ListTasks`, `CreateTask`, `UpdateTask`, `DeleteTask`.
- Daily: `GetDailyChallenge`, `GetLeaderboard`.
- Realtime: `internal/realtime/codeeditor/{hub,client}.go` — Yjs awareness + doc sync по WebSocket.

### learning/interview_prep — mock-интервью с AI
- **Session flow:** `ListTasks`, `StartSession`, `GetSession`, `SubmitSession`, `AnswerQuestion`, `ReviewSystemDesign`.
- **Mock-интервью (company-specific):** `ListCompanies`, `ListMockBlueprints`, `StartMockSession`, `GetMockSession`, `SubmitMockStage`, `ReviewMockSystemDesign`, `AnswerMockQuestion`, `AbortMockSession`.
- **Admin CRUD:** `{List,Create,Get,Update,Delete}AdminTask`, `{List,Create,Update,Delete}AdminQuestion`, `{List,Create,Update,Delete}MockQuestionPool`, `{List,Create,Update,Delete}MockCompanyPreset`.

### learning/mission — дневные миссии
- `GetDailyMissions`, `CompleteMission`.

### learning/peer_mock — P2P собеседования между юзерами
- Слоты: `CreateSlot`, `ListOpenSlots`, `ListMySlots`, `CancelSlot`.
- Бронь: `BookSlot`, `ListMyBookings`, `CancelBooking`.
- Review: `SubmitReview`, `GetMyReliability`.
- *Планируется (Killer #3):* `GetAIMockCoachReport(bookingId)` — Whisper → Claude-анализ.

### learning/training — training задачи
- `GetSkillTree`, `GetTask`, `EvaluateTaskSolution`.

### social/event — игровые события
- `ListEvents`, `CreateEvent`, `JoinEvent`, `LeaveEvent`, `UpdateEvent`, `DeleteEvent`, `InviteToEvent`.

### social/geo — карта и community
- `Resolve` (IP → геокоординаты), `CommunityMap`, `WorldPins`.

### social/guild — гильдии
- `ListGuilds`, `CreateGuild`, `JoinGuild`, `LeaveGuild`, `DeleteGuild`, `InviteToGuild`.
- `ListGuildMembers`, `GetGuildPulse`, `GetGuildMemberStats`.
- `ListGuildEvents`, `CreateGuildEvent`.
- `GetActiveGuildChallenge`, `CreateGuildChallenge`, `GetGuildWar`.
- *Планируется (Wave B.5):* полная механика Guild War (prep → active → champions duel → resolution + territory control).

### social/inbox — личные сообщения
- `ListThreads`, `GetThread`, `MarkThreadRead`, `SendMessage`, `GetUnreadCount`.

### social/notification — push + in-app
- Отправка: `Send`, `SendBatch`.
- Telegram: `RegisterChat`, `LinkTelegram`.
- Настройки: `GetSettings`, `UpdateSettings`, `UpdateGuildSettings`, `GetNotificationSettings`, `UpdateNotificationSettings`.
- *Планируется (Wave E.4):* `AdminBroadcast`.

### social/podcast — подкасты
- `ListPodcasts`, `GetPodcast`, `CreatePodcast`, `UploadPodcast`, `PreparePodcastUpload`, `CompletePodcastUpload`, `DeletePodcast`, `PlayPodcast`.

### social/referral — рефералки
- `ListReferrals`, `CreateReferral`, `UpdateReferral`, `DeleteReferral`.

### social/social — друзья
- `ListFriends`, `ListPendingRequests`, `SendFriendRequest`, `AcceptFriendRequest`, `DeclineFriendRequest`, `RemoveFriend`.

### adapter/auth_callback
- `ConfirmTelegramAuth`.

## Миграции (goose)

| # | Имя | Что |
|---|---|---|
| 00001 | core | users, sessions, базовые таблицы |
| 00002 | content | tasks / skills контент |
| 00003 | code_editor | code rooms, participants, solutions |
| 00004 | arena | matches, match_players |
| 00005 | interview_prep | mock blueprints, sessions, questions |
| 00006 | gamification | achievements, guild_members, challenges |
| 00007 | indexes_and_validation | перф-индексы + constraint |
| 00008 | skills | skill tree nodes + prerequisites |
| 00009 | user_activity_status | online/offline маркер |
| 00010 | reset_season_to_one | Season I как текущий |
| 00011 | seed_season_pass_tiers | 40 tiers free+premium |
| 00012 | peer_mock | mock_slots, mock_bookings, user_reliability |
| 00013 | arena_player_ratings | ELO рейтинги |
| 00014 | cosmetic_catalog_seed | 9 cosmetic items |
| 00015 | *(Wave D)* | `shop_owned_items.slot` column + assign slots |

## Realtime

- `internal/realtime/codeeditor/hub.go` — WebSocket hub для code rooms, Yjs awareness + doc sync.
- Message types: `doc_sync`, `awareness`, `cursor`, `solution_submitted`, `ai_review_ready`.

## AI Review

- Config: `cfg.External.AIReview.{ModelCode, ModelSystemDesign, ModelBehavioral}`.
- Провайдеры: Anthropic (Claude Opus/Sonnet/Haiku), OpenAI (gpt-4o-mini, gpt-5).
- Free tier: gpt-4o-mini + claude-haiku. Paid: opus/sonnet/gpt-5.

## Error handling

- `apihelpers.ParseUUID(raw, codeOnEmpty, fieldName)` — 401 UNAUTHENTICATED на пустую строку, 400 INVALID_<CODE> на невалидный UUID.
- Все handler'ы возвращают `connect.Error` с `code`, gateway мапит в HTTP статусы.
- Bubble'ят реальные ошибки через `klog.Errorf` — не глотать.
