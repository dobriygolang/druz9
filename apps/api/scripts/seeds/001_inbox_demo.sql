-- Demo inbox content. Inserts 4 threads per existing user (mentor, guild, system,
-- duel) if the user currently has zero inbox threads. Idempotent: re-running
-- against a user who already has threads is a no-op.

-- Helper CTE: pick users with no inbox threads yet.
WITH target_users AS (
    SELECT u.id AS user_id,
           COALESCE(NULLIF(u.username, ''), 'Wanderer') AS username
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM inbox_threads it WHERE it.user_id = u.id
    )
),

-- Mentor thread (kind = 1 per model.ThreadKindMentor).
mentor_threads AS (
    INSERT INTO inbox_threads (user_id, kind, subject, avatar, preview, unread_count, last_message_at, interactive)
    SELECT user_id, 1::SMALLINT, 'Varek · Mentor', '◉',
           'Your DFS solution is solid but watch the space complexity…',
           2, NOW() - INTERVAL '2 hours', TRUE
    FROM target_users
    RETURNING id, user_id
),
mentor_msgs AS (
    INSERT INTO inbox_messages (thread_id, sender_kind, sender_id, sender_name, body, read, created_at)
    SELECT mt.id, 3::SMALLINT, NULL, 'Varek',
           'Hey! I reviewed your last DFS submission. Solid approach overall.',
           FALSE, NOW() - INTERVAL '2 hours 15 minutes'
    FROM mentor_threads mt
    UNION ALL
    SELECT mt.id, 3::SMALLINT, NULL, 'Varek',
           'Your DFS solution is solid but watch the space complexity on deeply nested trees — you''re O(h) but h could be O(n) worst case.',
           FALSE, NOW() - INTERVAL '2 hours'
    FROM mentor_threads mt
    RETURNING id
),

-- Guild notice (non-interactive).
guild_threads AS (
    INSERT INTO inbox_threads (user_id, kind, subject, avatar, preview, unread_count, last_message_at, interactive)
    SELECT user_id, 2::SMALLINT, 'Mossveil Guild', '⛨',
           'Raid on Red Ravens begins in 2h — confirm participation',
           1, NOW() - INTERVAL '5 hours', FALSE
    FROM target_users
    RETURNING id, user_id
),
guild_msgs AS (
    INSERT INTO inbox_messages (thread_id, sender_kind, sender_id, sender_name, body, read, created_at)
    SELECT gt.id, 4::SMALLINT, NULL, 'Guild Bot',
           '⚔ Raid on Red Ravens begins in 2h. Please confirm participation in the guild hall.',
           FALSE, NOW() - INTERVAL '5 hours'
    FROM guild_threads gt
    RETURNING id
),

-- System announcement.
system_threads AS (
    INSERT INTO inbox_threads (user_id, kind, subject, avatar, preview, unread_count, last_message_at, interactive)
    SELECT user_id, 3::SMALLINT, 'System · Druz9', '✦',
           'Season III begins! Ember Pact is now live.',
           0, NOW() - INTERVAL '2 days', FALSE
    FROM target_users
    RETURNING id, user_id
),
system_msgs AS (
    INSERT INTO inbox_messages (thread_id, sender_kind, sender_id, sender_name, body, read, created_at)
    SELECT st.id, 2::SMALLINT, NULL, 'Druz9',
           '🔥 Season III — The Ember Pact — is live. Complete the chapter to unlock the Ember Sovereign frame.',
           TRUE, NOW() - INTERVAL '2 days'
    FROM system_threads st
    UNION ALL
    SELECT st.id, 2::SMALLINT, NULL, 'Druz9',
           'Weekly wrap: 3 duels won, 1 mock completed. Top 4% globally — keep the streak.',
           TRUE, NOW() - INTERVAL '2 days 10 minutes'
    FROM system_threads st
    RETURNING id
)

-- Post-duel chat.
INSERT INTO inbox_threads (user_id, kind, subject, avatar, preview, unread_count, last_message_at, interactive)
SELECT user_id, 4::SMALLINT, 'lunarfox', '🌙',
       'GG that reversal was clean. Rematch tomorrow?',
       0, NOW() - INTERVAL '1 day 3 hours', TRUE
FROM target_users;
