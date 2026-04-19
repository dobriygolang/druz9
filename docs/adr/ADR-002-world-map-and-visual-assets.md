# ADR-002: World Map & Visual Assets — Atlas, Hub, шрифты, AI-рекомендации

**Status:** Proposed
**Date:** 2026-04-19
**Scope:** issues #3, #4, #5, #17
**Related code:**
- `apps/front/src/pages/MapPage/ui/MapPage.tsx`
- `apps/front/src/pages/HubPage/ui/HubPage.tsx`
- `apps/front/public/img/` (big_map.svg 1.5M, mini_map.svg 178K, people/, *_cosmetic/, *_effect/)
- `apps/front/tailwind.config.ts`, `apps/front/src/app/styles/globals.css`
- `apps/api/internal/api/hub/{service,handler}.go`
- `apps/api/internal/model/profile_progress.go`

---

## Context

**Atlas (`/atlas`)** сейчас — MapLibre GL поверх OSM. Не помещается на ноутбучных экранах, текст пинов наезжает, нет масштабирования сцены/кластеризации, всё рассчитано на десктоп. Пользователь принёс `big_map.svg` (1.5M) с готовыми текстами/фонами/анимациями/иконками — хочет заменить им MapLibre.

**Hub (`/hub`)** — статичный дашборд с проблемами:
- «Превью арены» — `text-amber-900` на `bg-amber-950` (контраст ниже WCAG AA)
- «Выбор торговца» — UI существует, но семантически непонятно зачем выбирать
- «Цепочка кампании» (`CHAIN_STEPS`) — хардкод 7 этапов, не связан с прогрессом юзера
- «Твой путь» — `FALLBACK_JOURNEY_NODES` рисуется когда бек не вернул competencies

**Шрифты**: Cormorant Garamond + Manrope + Pixelify Sans + Press Start 2P. Кириллица технически поддерживается (Google Fonts cyrillic subset), но `Pixelify Sans` и `Press Start 2P` для русского визуально кривые (узкие глифы, отсутствуют части акцентов).

**SVG-ассеты в `public/img/`**: `mini_map`, `big_map`, `people/` (5 модульных аватаров), плюс косметика (`mask_cosmetic`, `cloak_icon_cosmetic`, `tiny_wizard_hat_cosmetic`), декор (`decorative_corner_sigil`, `hanging_ornament`, `trophy_stand_mini_decor`), эффекты (`fireflies_effect`, `rune_spark_effect`, `autumn_leaves_swirl`), компаньоны (`mini_ghost/raven/slime`). Сейчас почти ничего из этого не используется.

**AI-рекомендации**: `ProfileProgressRecommendation` и `NextAction` уже есть в `profile_progress.go`. Сервиса, который их **генерирует через LLM** на основе истории — нет. Текущие рекомендации — детерминированные (по `competency.score`).

## Decision

1. **Atlas**: переписать как **interactive SVG canvas** на основе `big_map.svg`. MapLibre выпиливаем — это перебор для стилизованной игровой карты.
2. **SVG pipeline**: разобрать оба map-SVG через SVGO + ручной парсинг на слои (`background`, `regions`, `landmarks`, `labels`, `effects`). Слои монтируются как React-компоненты с `<svg>` viewBox + zoom/pan через `@panzoom/panzoom` или `react-zoom-pan-pinch`.
3. **Hub**: переразложить блоки, исправить контраст, привязать `CHAIN_STEPS` к данным.
4. **Шрифты**: сменить заголовочный pixel-шрифт на cyrillic-friendly (`VT323` или `Pixeloid Sans` с кириллицей), оставить `Manrope` для body — он уже хорош.
5. **AI Insights**: новый сервис `apps/api/internal/app/insights/` — раз в сутки (cron) генерирует персональный отчёт через mentor LLM (см. ADR-001) и кладёт в `user_insights` таблицу. Atlas-страница рендерит карточки с `insights`.

## Options Considered (Atlas)

### Option A: Static SVG + zoom/pan layer (рекомендуется)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Performance | High — один SVG, GPU transforms |
| Interactivity | Medium — нужно повесить handler'ы на `<g id="region-*">` |
| Asset reuse | High — используем готовый `big_map.svg` |

**Pros:** красиво, ровно то что просит пользователь, легко добавить анимации (CSS на `<g>`/`<path>`).
**Cons:** 1.5MB SVG в bundle (mitigation: lazy import + gzip ~300KB; вынести в `/public/img/` и грузить через `<img>` или `fetch+innerHTML` для интерактива).

### Option B: Continue MapLibre, добавить custom style/sprites
**Pros:** geo-функции бесплатно. **Cons:** пользователь явно хочет иной визуал; geo-данные не нужны для игровой карты.

### Option C: Canvas/PixiJS-renderer
**Pros:** 60fps анимации с тысячами объектов. **Cons:** оверкил, теряем accessibility и SEO, разработка дольше.

**Берём A.** Если понадобится >100 анимированных пинов — мигрируем точечно на canvas-overlay.

## SVG Pipeline (детали)

```
public/img/big_map.svg
  ↓ scripts/svg-extract.ts (новый)
  ↓ — парсит <g id="..."> группы
  ↓ — разделяет на: background.svg, regions/{region-1..N}.svg, labels.json, effects/*.svg
  ↓
src/widgets/Atlas/assets/
  background.svg          ← плоский фон без интерактива
  regions/                ← clickable области
  labels.json             ← {id, x, y, text_ru, text_en} — тексты выкинуты, рендерим через i18n
  effects/                ← CSS-анимируемые слои (fireflies, rune_spark)
src/widgets/Atlas/ui/AtlasCanvas.tsx
  ← собирает слои, навешивает onClick, pan/zoom
```

Регионы получают `data-region-id` → клик открывает side-panel с данными от бека (`hubApi.getRegionContext()` — новый endpoint).

## Hub fixes

- **Контраст**: `bg-amber-950 text-amber-900` → `bg-amber-950 text-amber-50/90` (ratio >7:1).
- **«Выбор торговца»**: сменить семантику. Это weekly merchant rotation — значит блок должен называться «Лавка недели» и показывать **сегодняшнее** предложение, без выбора. Удалить selector.
- **«Цепочка кампании»**: связать `CHAIN_STEPS` с реальной кампанией. Бек должен вернуть `campaign.steps[]` (новое поле в `HubOverview`). Источник — `apps/api/internal/api/hub/handler.go:buildQuest`.
- **«Твой путь»**: убрать `FALLBACK_JOURNEY_NODES`, при пустых competencies показывать empty-state CTA «Пройди интервью, чтобы построить путь».

## Шрифты

| Текущий | Замена | Почему |
|---------|--------|--------|
| Pixelify Sans (заголовки) | **VT323** или **Pixeloid Sans** | Полный cyrillic glyph set |
| Press Start 2P (CTA) | **Silkscreen** (уже подключён, оставить только для EN-only мест) | Удалить cyrillic использование |
| Cormorant Garamond | оставить | Хорошая кириллица |
| Manrope | оставить | Отличная кириллица |

В `tailwind.config.ts` добавить `font-pixel-ru` (новое семейство). На страницах с RU локалью — переключать через CSS-переменную `--font-pixel: var(--font-pixel-ru)` в `<html lang="ru">`.

## AI Insights service

```
apps/api/internal/app/insights/
  service.go        — Generate(ctx, userID) (Insight, error)
  prompt.go         — собирает контекст: competencies, mock-история, последние 50 вопросов, время решения
  store.go          — user_insights (id, user_id, generated_at, summary, recommendations jsonb)
  cron.go           — каждые 24h для активных юзеров (login за 7 дней)
```

Промпт идёт в LLM (mentor с `provider=openrouter`, model `gpt-4o-mini`) с инструкцией вернуть JSON `{summary, top_strengths[], top_gaps[], next_steps[]}`. Парсим, валидируем (jsonschema), кладём в БД.

Atlas рендерит «Совет картографа» — карточку поверх карты с текущим insight.

## Action Items

### Backend
1. [ ] `apps/api/api/social/hub/v1/hub.proto` — добавить `Campaign campaign = N` и `RegionContext` message; `GetRegionContext(region_id)` RPC.
2. [ ] `apps/api/api/social/insights/v1/insights.proto` — `GetMyInsight()`, `Insight {summary, top_strengths, top_gaps, next_steps[], generated_at}`.
3. [ ] Migration `00023_user_insights.sql`.
4. [ ] `apps/api/internal/app/insights/` — реализация + cron-job в `cmd/api/insights_worker.go` (по аналогии с `guild_war_worker.go`).
5. [ ] Mock-tested через mockery (`mocks/insights/`).

### Frontend (web)
6. [ ] `scripts/svg-extract.ts` — node-скрипт SVG → слои. Запускать вручную при обновлении ассета.
7. [ ] `apps/front/src/widgets/Atlas/` — новый widget, заменяет MapPage. Убираем maplibre-gl из package.json.
8. [ ] Установить `react-zoom-pan-pinch`.
9. [ ] `apps/front/src/pages/HubPage/ui/HubPage.tsx` — фиксы контраста, удалить torговца-селектор, привязать chain к `hub.campaign`.
10. [ ] `tailwind.config.ts` + `globals.css` — добавить cyrillic-friendly pixel-font.
11. [ ] Atlas: рендер карточки insight из `GET /api/v1/insights/me`.

### Assets
12. [ ] Прогнать `big_map.svg`, `mini_map.svg` через SVGO (`svgo --multipass`) — обычно 30–60% веса.
13. [ ] Удалить `<text>` ноды из big_map (вынести в `labels.json`).

## Consequences

**Easier:** добавлять новые регионы/анимации, локализовать карту.
**Harder:** нужен ручной разбор SVG (один раз, ~3–5 часов).
**Revisit:** если будет >5000 активных пинов — перейти на canvas-overlay поверх SVG-фона.

## Open questions

- Бюджет на OpenAI/OpenRouter для insights (1 запрос на DAU/день — оценить cost при текущем DAU).
- Кто платит за storage `user_insights` (TTL? 30 дней rolling?).
