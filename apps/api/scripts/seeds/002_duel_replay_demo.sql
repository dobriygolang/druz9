-- Demo duel replay. Picks the first two users in the DB and builds one
-- sample replay with 13 timeline events (mirrors what the front-end demo
-- page used to hard-code). Idempotent: uses ON CONFLICT guard via the
-- (source_kind, source_id) unique constraint — we pick a deterministic
-- source_id derived from the pair of user ids.

DO $$
DECLARE
    u1 UUID;
    u2 UUID;
    u1_name TEXT;
    u2_name TEXT;
    replay_id UUID;
    demo_source_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    -- Pick any two users deterministically.
    SELECT id, COALESCE(NULLIF(username, ''), 'player1')
      INTO u1, u1_name
      FROM users
     ORDER BY created_at ASC
     LIMIT 1;

    SELECT id, COALESCE(NULLIF(username, ''), 'player2')
      INTO u2, u2_name
      FROM users
     WHERE id <> u1
     ORDER BY created_at ASC
     LIMIT 1;

    -- Need at least two users to seed the demo.
    IF u1 IS NULL OR u2 IS NULL THEN
        RETURN;
    END IF;

    -- Skip if the demo replay already exists.
    IF EXISTS (SELECT 1 FROM duel_replays
               WHERE source_kind = 1 AND source_id = demo_source_id) THEN
        RETURN;
    END IF;

    INSERT INTO duel_replays (
        source_kind, source_id, player1_id, player1_username, player2_id, player2_username,
        task_title, task_topic, task_difficulty, duration_ms, winner_id, completed_at
    ) VALUES (
        1, demo_source_id, u1, u1_name, u2, u2_name,
        'Shortest path · weighted DAG', 'graphs', 2, 600000, u1, NOW() - INTERVAL '1 day'
    ) RETURNING id INTO replay_id;

    -- Player 1 timeline (winner).
    INSERT INTO duel_replay_events (replay_id, user_id, t_ms, kind, label, lines_count) VALUES
        (replay_id, u1,   15000, 6, 'first keystroke',      3),
        (replay_id, u1,   90000, 2, 'run · 2/5 pass',       14),
        (replay_id, u1,  180000, 2, 'run · 3/5 pass',       28),
        (replay_id, u1,  240000, 5, 'peeked hint #1',       30),
        (replay_id, u1,  300000, 2, 'run · 4/5 pass',       34),
        (replay_id, u1,  420000, 4, 'submit · hidden #3 failed', 42),
        (replay_id, u1,  510000, 2, 'run · 5/5 pass',       52),
        (replay_id, u1,  545000, 3, 'ACCEPTED · 6/6',       52);

    -- Player 2 timeline (loser).
    INSERT INTO duel_replay_events (replay_id, user_id, t_ms, kind, label, lines_count) VALUES
        (replay_id, u2,    8000, 6, 'first keystroke',      2),
        (replay_id, u2,   80000, 2, 'run · 3/5 pass',       18),
        (replay_id, u2,  200000, 2, 'run · 4/5 pass',       32),
        (replay_id, u2,  320000, 4, 'submit · TLE on test #4', 40),
        (replay_id, u2,  440000, 2, 'run · 5/5 pass',       46),
        (replay_id, u2,  480000, 4, 'submit · hidden #2 failed', 46);
END $$;
