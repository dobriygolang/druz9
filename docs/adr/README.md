# Architecture Decision Records (ADR)

Единый журнал архитектурных решений druz9. Каждое ADR закрывает группу связанных задач, чтобы implementation можно было распараллелить.

| № | Title | Scope | Status |
|---|-------|-------|--------|
| 001 | [AI Mentors Registry](ADR-001-ai-mentors-registry.md) | провайдеры, ключи в админке, биллинг, solo-practice (#1, #2) | Proposed |
| 002 | [World Map & Visual Assets](ADR-002-world-map-and-visual-assets.md) | Atlas SVG, Hub-фиксы, шрифты, AI insights (#3, #4, #5, #17) | Proposed |
| 003 | [Customization & Guilds](ADR-003-customization-and-guilds.md) | Hero Room, Guild Hall, scene editor, permissions (#6, #9 — блокер прода) | Proposed |
| 004 | [Social Layer](ADR-004-social-layer-arena-war-events.md) | Arena 2v2, Guild War live, Events visibility, onboarding (#7, #11) | Proposed |
| 005 | [Platform Polish](ADR-005-platform-polish-settings-i18n-podcast.md) | i18n cleanup, settings, podcast series + global player (#15, #16) | Proposed |

## Suggested rollout order

1. **ADR-003** — закрывает блокер прода (guild customization).
2. **ADR-001** — разблокирует монетизацию (платные менторы) и чистит solo-practice.
3. **ADR-005** — быстрый user-perceived polish (мало кода, много эффекта).
4. **ADR-004** — расширение социальных механик после стабилизации базы.
5. **ADR-002** — самая объёмная визуальная работа (SVG pipeline + insights service).

## Cross-cutting reminders

- Новые endpoints — через `proto` + `make generate`.
- Тесты — через mockery (codegen).
- Backend (gRPC-gateway) всегда возвращает camelCase; не вводить snake_case в фронтовых API-файлах.
- Миграции нумеруются последовательно: следующий свободный — `00023_*` (последняя занятая — `00022_backfill_arena_elo`). В ADR-001..005 номера были рассчитаны от `00022`; при имплементации сдвинуть на +1.
