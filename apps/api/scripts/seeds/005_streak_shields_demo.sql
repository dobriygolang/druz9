-- Give every existing user 2 starter streak shields so the Streak Recovery
-- flow can be tried without a shop purchase. Idempotent via ON CONFLICT.

INSERT INTO user_streak_shields (user_id, owned_count, total_purchased)
SELECT id, 2, 2
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_streak_shields usp WHERE usp.user_id = users.id
);
