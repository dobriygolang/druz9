-- +migrate Up
INSERT INTO interview_prep_tasks (
    id, slug, title, statement, prep_type, language, is_executable,
    execution_profile, runner_mode, duration_seconds, starter_code,
    reference_solution, is_active, created_at, updated_at
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'go-two-sum-prep',
    'Two Sum + follow-up questions',
    'Дан массив чисел и target. Верни индексы двух чисел, сумма которых равна target.',
    'coding',
    'go',
    true,
    'pure',
    'function_io',
    1800,
    'package main

func solve(input string) string {
    return "implement me"
}
',
    'map[int]int',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    statement = EXCLUDED.statement,
    prep_type = EXCLUDED.prep_type,
    is_executable = EXCLUDED.is_executable,
    execution_profile = EXCLUDED.execution_profile,
    runner_mode = EXCLUDED.runner_mode,
    duration_seconds = EXCLUDED.duration_seconds,
    starter_code = EXCLUDED.starter_code,
    reference_solution = EXCLUDED.reference_solution,
    updated_at = NOW();

INSERT INTO interview_prep_questions (id, task_id, position, prompt, answer, created_at, updated_at)
VALUES
    ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 1, 'Какая асимптотика у решения через hash map?', 'По времени O(n), по памяти O(n).', NOW(), NOW())
ON CONFLICT (task_id, position) DO UPDATE SET
    prompt = EXCLUDED.prompt,
    answer = EXCLUDED.answer,
    updated_at = NOW();

INSERT INTO interview_prep_questions (id, task_id, position, prompt, answer, created_at, updated_at)
VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, 'Почему нельзя брать адрес значения map-элемента в Go?', 'Потому что элементы map могут перемещаться при росте хеш-таблицы, адрес нестабилен.', NOW(), NOW())
ON CONFLICT (task_id, position) DO UPDATE SET
    prompt = EXCLUDED.prompt,
    answer = EXCLUDED.answer,
    updated_at = NOW();

-- +migrate Down
DELETE FROM interview_prep_questions WHERE task_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM interview_prep_tasks WHERE id = '11111111-1111-1111-1111-111111111111';