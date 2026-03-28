# Seeds

`scripts/seeds` хранит data-driven seed assets.

Структура:

- `*.sql` — SQL сиды, которые применяются runner'ом напрямую.
- `catalogs/*.json` / `catalogs/*.yaml` — каталоги задач для Go seed packs.

Сейчас используется:

- `test_users.sql`
- `catalogs/blind75.json`

Важно:

- сначала `make migrate-up`
- потом `make seed-up`
- `seed_runs` больше не создается fallback-ом из кода, это часть схемы БД

Команды:

- `make seed-up`
- `make seed-sql`
- `make seed-blind75`
- `make seed-status`

Формат каталога задач:

```json
{
  "version": "my-pack-v1",
  "tasks": [
    {
      "slug": "task-slug",
      "title": "Task Title",
      "difficulty": "easy",
      "statement": "Описание задачи",
      "topics": ["arrays"],
      "cases": [
        {
          "input": "1 2 3",
          "output": "6",
          "is_public": true
        }
      ]
    }
  ]
}
```

Новые packs лучше добавлять через `catalogs/*.json` или `catalogs/*.yaml`, а не через большой Go-файл со списком задач.
