# ADR-001: AI Mentors Registry — провайдеры, модели, биллинг, solo-practice

**Status:** Proposed
**Date:** 2026-04-19
**Deciders:** Sergey (product/eng), AI/Interview owner
**Scope:** issues #1, #2 из списка
**Related code:**
- `apps/api/internal/aireview/{openai.go,gemini.go,service.go}`
- `apps/api/api/core/admin/v1/ai_mentor.proto`
- `apps/api/internal/api/admin/{create,list,update,delete}_aimentor.go`
- `apps/api/internal/api/interview_live/handler.go`
- `apps/api/internal/api/interview_prep/public.go`
- `apps/api/internal/app/interviewprep/mock.go`
- `apps/api/scripts/migrations/00021_ai_mentors.sql`
- `apps/front/src/pages/InterviewHubPage/ui/InterviewHubPage.tsx`

---

## Context

Сейчас в проекте есть **два разных слоя выбора модели**, не связанных друг с другом:

1. **Hardcoded provider в bootstrap-конфиге** (`aireview.Config.Provider/Model/APIKey`). Меняется только через ENV + рестарт. Реальный «активный» провайдер для всего interview-live flow один.
2. **Wave E.3 — AI Mentors CRUD** (`ai_mentors` таблица). Хранит `provider`, `model_id`, `tier (0=free,1=premium)`, `prompt_template`. Но эти поля **никуда не подключены** — `interview_live/handler.go` берёт `ModelOverride` из тела запроса, а не из ментора. `prompt_template` тоже игнорируется.

В результате:
- Админка позволяет создать ментора, но он не влияет на runtime-поведение чата.
- API-ключи живут только в ENV (`AI_OPENAI_API_KEY`, `AI_GEMINI_API_KEY`). Добавить новый ключ из админки нельзя.
- Нет связи `User ↔ owned_mentors`. Шоп уже умеет (`shop_items`/`user_shop_inventory`/`equip` + слоты), но категории `mentor` в каталоге нет.
- `?mode=solo&focus=algorithms` query-params в `InterviewHubPage:108` игнорируются — `navigate('/interview/live/new')` без них. Solo-practice чат отправляет сообщение в `/api/v1/interview/live/chat`, но из-за `companyTag`/blueprint-зависимостей выкидывает на peer-mocks при ошибках типа `ErrMockTaskPoolIncomplete`.
- Хардкод «78% Готов» — это `readiness.score` из `ProfileProgressOverview`. Должен быть привязан к юзеру (поле уже есть на беке), баг в том, что фронт может рендерить fallback.

Пользователь упомянул «сайт с очень многими нейронками» — это означает, что подразумевается **OpenRouter-совместимый агрегатор**: один API-ключ, десятки моделей, выбор через `model` в payload. Сейчас агрегатора нет.

## Decision

Принять **Mentor-as-Profile** архитектуру: ментор в БД — это полное описание runtime-поведения (provider + model + ключ + system prompt + tools + цена). `interview_live/chat` обязательно резолвит ментора по ID; ENV-ключи остаются только как fallback для миграции.

Добавить **OpenRouter-провайдера** как третий драйвер. Через него админ получает доступ к каталогу моделей без релиза кода.

Биллинг переиспользует существующий `shop` — добавляется категория `mentor` и слот `mentor_active`.

Solo-practice превращается в **первоклассный режим InterviewSession** с типом `SOLO`, который не требует blueprint и не блокируется `ErrAnotherMockSessionActive`.

## Options Considered

### Option A: Mentor-as-Profile + OpenRouter (рекомендуется)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — новый драйвер + расширение модели + миграции |
| Cost | Low — OpenRouter pay-as-you-go, ключи в БД (encrypted) |
| Scalability | High — добавить модель = одна запись в админке |
| Team familiarity | High — знаем aireview, shop, admin CRUD |

**Pros:**
- Единая точка правды о ментoре
- Админ управляет каталогом без деплоя
- Биллинг бесплатно достаётся из `shop`
- Solo-practice чисто отделяется от mock-flow

**Cons:**
- Нужно зашифровать `api_key` в БД (KMS или libsodium-secretbox с master-key из ENV)
- Миграция существующих ENV-ключей в БД
- OpenRouter добавляет внешнюю зависимость и единый billing-аккаунт

### Option B: Оставить ENV-ключи, в БД хранить только `provider+model+tier`

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Low |
| Scalability | Low — новый провайдер требует деплой |
| Team familiarity | High |

**Pros:** минимум кода. **Cons:** не решает запрос пользователя «добавлять ключи из админки».

### Option C: Per-user BYO-key (пользователь приносит свой ключ)

**Pros:** ноль расходов на OpenAI. **Cons:** UX боль, freemium-модель ломается, повышенный риск утечки. Отвергнуто.

## Trade-off Analysis

**B vs A:** B экономит ~3 дня работы, но прямо противоречит требованию «в админке добавлять ключи». Берём A.

**OpenRouter vs прямые провайдеры:** прямые дешевле на ~5–15% (меньше маржи), но добавление новой модели = новый Go-файл + релиз. OpenRouter снимает эту цену — оставляем оба пути (admin выбирает `provider: openai|gemini|openrouter`).

**Шифрование ключей:** symmetric encryption с master-key из ENV (`AI_MENTOR_KEY_KMS`) — простой, ротация через переписывание строк. KMS избыточен для текущего масштаба.

## Consequences

**Easier:**
- Добавление модели/ментора — одна запись в админке
- A/B-тесты разных system-prompts без релиза
- Shop monetization для премиум-менторов из коробки

**Harder:**
- Тестирование — нужен fake-driver с записанными ответами (моки для `aireview.Provider` интерфейса)
- Observability — метрики per-mentor (latency, token cost, error rate) обязательны, иначе админ не поймёт что сломалось

**To revisit:**
- Когда менторов станет >50 — нужен поиск/фильтр в админке
- Per-org API ключи (если придут команды/компании как клиенты)

## Action Items

### Backend

1. [ ] **Proto** `apps/api/api/core/admin/v1/ai_mentor.proto` — расширить `AIMentor`:
   ```proto
   message AIMentor {
     string id = 1;
     string name = 2;
     string provider = 3;        // "openai" | "gemini" | "openrouter"
     string model_id = 4;        // e.g. "gpt-4o-mini" / "anthropic/claude-sonnet-4-6"
     int32  tier = 5;            // 0=free, 1=premium
     string system_prompt = 6;   // NEW — заменяет prompt_template
     string persona_blurb = 7;   // NEW — короткое описание для UI
     int64  price_gold = 8;      // NEW — 0 для free
     int64  price_gems = 9;      // NEW
     string avatar_ref = 10;     // NEW — путь в shop_items.icon_ref-style
     bool   is_active = 11;
     // api_key хранится в отдельной таблице ai_mentor_secrets, в proto не возвращается
   }
   message UpsertSecretRequest { string mentor_id = 1; string api_key = 2; }
   ```
2. [ ] **Migration** `00022_ai_mentors_secrets.sql`:
   ```sql
   ALTER TABLE ai_mentors
     ADD COLUMN system_prompt TEXT NOT NULL DEFAULT '',
     ADD COLUMN persona_blurb TEXT NOT NULL DEFAULT '',
     ADD COLUMN price_gold BIGINT NOT NULL DEFAULT 0,
     ADD COLUMN price_gems BIGINT NOT NULL DEFAULT 0,
     ADD COLUMN avatar_ref TEXT NOT NULL DEFAULT '';
   CREATE TABLE ai_mentor_secrets (
     mentor_id UUID PRIMARY KEY REFERENCES ai_mentors(id) ON DELETE CASCADE,
     encrypted_key BYTEA NOT NULL,
     nonce BYTEA NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE TABLE user_owned_mentors (
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     mentor_id UUID NOT NULL REFERENCES ai_mentors(id) ON DELETE CASCADE,
     acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, mentor_id)
   );
   ```
3. [ ] **Провайдер OpenRouter**: `apps/api/internal/aireview/openrouter.go` — реализовать `aireview.Provider` интерфейс (Chat, ChatStream).
4. [ ] **Mentor resolver**: `apps/api/internal/aireview/registry.go` — `Resolve(ctx, mentorID) (Provider, ResolvedMentor, error)`. Кеш на 60 сек. Расшифровка ключа через `aireview/secrets.go` (NaCl secretbox, master-key из `AI_MENTOR_KEY_KMS`).
5. [ ] **interview_live/handler.go**: убрать `ModelOverride`, читать `MentorID` из запроса. Перед `Chat()` вызывать `registry.Resolve(mentorID)` и подкладывать system_prompt + provider.
6. [ ] **Admin secret RPC**: `UpsertMentorSecret(mentor_id, api_key)`, `RotateMentorSecret(mentor_id)`. Не возвращать ключ в `Get`/`List`.
7. [ ] **Solo-practice service**: `apps/api/internal/app/interviewprep/solo.go` — новый `StartSoloSession(userID, focus)` без blueprint. Создаёт `interview_sessions` row с `mode=SOLO`, `focus=algorithms|system_design|behavioral`. **НЕ** триггерит `ErrAnotherMockSessionActive` (отдельный constraint только на `mode=MOCK`).
8. [ ] **Proto** `interview_prep.proto` — `StartSoloSession(focus, mentor_id) returns (SessionStarted)`. Endpoint `POST /api/v1/interview/sessions/solo`.
9. [ ] **Shop integration**: добавить `ItemCategoryMentor` в `apps/api/internal/model/shop.go`. При покупке item с category=mentor + extra_payload `{mentor_id}` — вставлять row в `user_owned_mentors`. Equip → запись в `user_active_mentor` (single value per user, можно отдельную таблицу или поле в `users`).
10. [ ] **Биллинг при /chat**: если `tier=1` и `mentor_id` не в `user_owned_mentors` юзера — `403 mentor_not_owned`.
11. [ ] **Метрики (Prometheus)**: `aireview_chat_latency_ms{mentor,provider}`, `aireview_chat_tokens{mentor,direction}`, `aireview_chat_errors{mentor,provider,code}`.
12. [ ] **Тесты (моки)**: `mockery` сгенерировать `mocks.Provider`, `mocks.MentorRepo`. Юнит-тест `registry_test.go` (cache hit, secret decrypt, missing mentor). Интеграционный — solo-session lifecycle.

### Frontend (web)

13. [ ] **`InterviewHubPage`**: блок «Выбери ментора» — карточки из `GET /api/v1/interview-prep/ai-mentors` (уже есть). Добавить badge цены, lock-icon если `tier=1` и не куплен. CTA «Купить» открывает shop modal с `category=mentor`.
14. [ ] **Solo-practice**: при `?mode=solo` сразу `POST /interview/sessions/solo` и редирект в чат-комнату; больше не дёргать mock-flow.
15. [ ] **Readiness 78%**: убрать fallback-литерал, всегда читать из `progress.readiness.score`. Добавить skeleton при загрузке.

### Frontend (admin)

16. [ ] Добавить в `AIMentorForm`: textarea system_prompt, persona_blurb, price_gold/gems, avatar upload, кнопка «Загрузить ключ» (отдельный endpoint, ключ маскируется как `••••1234`).

### Rollout

17. [ ] Скрипт миграции ENV→БД: для каждого активного провайдера — создать ментора с дефолтным system_prompt и положить ENV-ключ в `ai_mentor_secrets`.
18. [ ] Feature-flag `aireview.useRegistry=true`. После недели обкатки — удалить старый `ModelOverride` код.
