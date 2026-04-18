-- Demo friend challenges between the first two users in the DB: one incoming
-- (opponent needs to act), one sent (waiting on them), two completed.
-- Idempotent via (challenger_id, opponent_id, task_title) existence guard.

DO $$
DECLARE
    u1 UUID; u2 UUID;
BEGIN
    SELECT id INTO u1 FROM users ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO u2 FROM users WHERE id <> u1 ORDER BY created_at ASC LIMIT 1;
    IF u1 IS NULL OR u2 IS NULL THEN RETURN; END IF;

    -- Skip if any demo challenge already exists between this pair.
    IF EXISTS (
        SELECT 1 FROM friend_challenges
        WHERE (challenger_id = u1 AND opponent_id = u2)
           OR (challenger_id = u2 AND opponent_id = u1)
    ) THEN
        RETURN;
    END IF;

    -- Incoming to u1: u2 sent them a medium graphs task.
    INSERT INTO friend_challenges (
        challenger_id, opponent_id, task_title, task_topic, task_difficulty,
        task_ref, note, status, deadline_at, created_at
    ) VALUES (
        u2, u1, 'Shortest path in weighted DAG', 'graphs', 2,
        'training:graph-dfs', 'Bet you can''t beat my time!',
        1, NOW() + INTERVAL '46 hours', NOW() - INTERVAL '2 hours'
    );

    -- Sent by u1 to u2: pending their action.
    INSERT INTO friend_challenges (
        challenger_id, opponent_id, task_title, task_topic, task_difficulty,
        task_ref, note, status, deadline_at, created_at
    ) VALUES (
        u1, u2, 'Median of two sorted arrays', 'arrays', 3,
        'training:arrays-median', '',
        1, NOW() + INTERVAL '45 hours', NOW() - INTERVAL '3 hours'
    );

    -- Completed: u1 won.
    INSERT INTO friend_challenges (
        challenger_id, opponent_id, task_title, task_topic, task_difficulty,
        task_ref, status,
        challenger_submitted_at, challenger_time_ms, challenger_score,
        opponent_submitted_at,   opponent_time_ms,   opponent_score,
        winner_id, deadline_at, created_at, completed_at
    ) VALUES (
        u1, u2, 'Merge intervals', 'arrays', 2, 'training:merge-intervals',
        3,
        NOW() - INTERVAL '2 days 4 hours', 372000, 5,
        NOW() - INTERVAL '2 days 5 hours', 578000, 4,
        u1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'
    );

    -- Completed: u2 won.
    INSERT INTO friend_challenges (
        challenger_id, opponent_id, task_title, task_topic, task_difficulty,
        task_ref, status,
        challenger_submitted_at, challenger_time_ms, challenger_score,
        opponent_submitted_at,   opponent_time_ms,   opponent_score,
        winner_id, deadline_at, created_at, completed_at
    ) VALUES (
        u1, u2, 'LRU cache', 'design', 2, 'training:lru-cache',
        3,
        NOW() - INTERVAL '4 days 2 hours', 860000, 3,
        NOW() - INTERVAL '4 days 3 hours', 520000, 5,
        u2, NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'
    );
END $$;
