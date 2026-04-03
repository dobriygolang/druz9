# Ozon Mock Catalogs

Эта папка хранит сырой контент mock interview, выгруженный из PDF, и
локальный конвертер в обычный `interview_prep`-совместимый pack.

Что здесь лежит:

- `ozon_*_mock.json` — разрезанные по темам mock-каталоги.
- `ozon_mock_index.json` — индекс со сводкой по количеству задач.
- `convert_to_interview_prep.py` — конвертер mock-каталогов в обычный
  `interview_prep` формат.
- `interview_prep_ozon.json` — результат работы конвертера.

Как запускать:

```bash
python3 api/scripts/seeds/catalogs/ozon/convert_to_interview_prep.py
```

Что делает конвертер:

- читает все `ozon/*_mock.json`, кроме `ozon_mock_index.json`;
- собирает один обычный `interview_prep` pack;
- пишет результат в `interview_prep_ozon.json`.

Что конвертер не делает:

- не меняет `api/scripts/seeds/catalogs/interview_prep.json`;
- не подключает новый pack в seed runner автоматически;
- не меняет mock catalog flow.
