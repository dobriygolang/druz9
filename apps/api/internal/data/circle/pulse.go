package circle

import (
	"context"
	"errors"
	"fmt"
	"time"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) GetCirclePulse(ctx context.Context, circleID uuid.UUID) (*model.CirclePulse, error) {
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	weekAgo := todayStart.AddDate(0, 0, -6) // 7 days including today

	// Query 1: member count (reads indexed column).
	var totalMembers int32
	if err := r.data.DB.QueryRow(ctx,
		`SELECT member_count FROM circles WHERE id = $1`, circleID,
	).Scan(&totalMembers); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kratoserrors.NotFound("CIRCLE_NOT_FOUND", "circle not found")
		}
		return nil, fmt.Errorf("get circle member count: %w", err)
	}

	pulse := &model.CirclePulse{
		TotalMembers:  totalMembers,
		WeekActivity:  make([]*model.CircleDayActivity, 0, 7),
		RecentActions: make([]*model.CircleMemberAction, 0, 20),
	}

	// Query 2: week activity + active today in a single query.
	// Uses one UNION ALL scan over all activity tables, aggregates by day,
	// and computes COUNT(DISTINCT user_id) for today in the same pass.
	rows, err := r.data.DB.Query(ctx, `
WITH members AS (
  SELECT user_id FROM circle_members WHERE circle_id = $1
),
days AS (
  SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS d
),
all_activity AS (
  SELECT s.user_id, COALESCE(s.finished_at, s.updated_at) AS ts, 'daily' AS kind
  FROM interview_practice_sessions s
  WHERE s.user_id IN (SELECT user_id FROM members)
    AND s.status = 'finished'
    AND COALESCE(s.finished_at, s.updated_at) >= $2

  UNION ALL

  SELECT ap.user_id, am.finished_at AS ts, 'duel' AS kind
  FROM arena_match_players ap
  JOIN arena_matches am ON am.id = ap.match_id
  WHERE ap.user_id IN (SELECT user_id FROM members)
    AND am.status = 3
    AND am.finished_at >= $2

  UNION ALL

  SELECT ms.user_id, ms.finished_at AS ts, 'mock' AS kind
  FROM interview_mock_sessions ms
  WHERE ms.user_id IN (SELECT user_id FROM members)
    AND ms.status = 'finished'
    AND ms.finished_at >= $2
)
SELECT
  days.d::text,
  COALESCE(SUM(CASE WHEN a.kind = 'daily' THEN 1 ELSE 0 END), 0)::int4,
  COALESCE(SUM(CASE WHEN a.kind = 'duel' THEN 1 ELSE 0 END), 0)::int4,
  COALESCE(SUM(CASE WHEN a.kind = 'mock' THEN 1 ELSE 0 END), 0)::int4,
  COUNT(DISTINCT CASE WHEN days.d = $3::date THEN a.user_id END)::int4
FROM days
LEFT JOIN all_activity a ON DATE(a.ts AT TIME ZONE 'UTC') = days.d
GROUP BY days.d
ORDER BY days.d ASC`, circleID, weekAgo, todayStart)
	if err != nil {
		return nil, fmt.Errorf("query week activity: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var da model.CircleDayActivity
		var activeToday int32
		if err := rows.Scan(&da.Date, &da.DailyCount, &da.DuelCount, &da.MockCount, &activeToday); err != nil {
			return nil, fmt.Errorf("scan day activity: %w", err)
		}
		if activeToday > 0 {
			pulse.ActiveToday = activeToday
		}
		pulse.WeekActivity = append(pulse.WeekActivity, &da)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate week activity: %w", err)
	}

	// Query 3: recent actions (last 20).
	actionRows, err := r.data.DB.Query(ctx, `
WITH members AS (
  SELECT user_id FROM circle_members WHERE circle_id = $1
)
(
  SELECT s.user_id,
    COALESCE(NULLIF(u.first_name,''),'') AS first_name,
    COALESCE(NULLIF(u.last_name,''),'') AS last_name,
    COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), '') AS avatar_url,
    'daily' AS action_type,
    '' AS action_detail,
    COALESCE(s.finished_at, s.updated_at) AS happened_at
  FROM interview_practice_sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.user_id IN (SELECT user_id FROM members)
    AND s.status = 'finished'
    AND COALESCE(s.finished_at, s.updated_at) >= $2
  ORDER BY happened_at DESC LIMIT 20
)
UNION ALL
(
  SELECT ap.user_id,
    COALESCE(NULLIF(u.first_name,''),'') AS first_name,
    COALESCE(NULLIF(u.last_name,''),'') AS last_name,
    COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), '') AS avatar_url,
    'duel' AS action_type,
    CASE WHEN ap.is_winner THEN 'won' ELSE 'played' END AS action_detail,
    am.finished_at AS happened_at
  FROM arena_match_players ap
  JOIN arena_matches am ON am.id = ap.match_id
  JOIN users u ON u.id = ap.user_id
  WHERE ap.user_id IN (SELECT user_id FROM members)
    AND am.status = 3
    AND am.finished_at >= $2
  ORDER BY happened_at DESC LIMIT 20
)
UNION ALL
(
  SELECT ms.user_id,
    COALESCE(NULLIF(u.first_name,''),'') AS first_name,
    COALESCE(NULLIF(u.last_name,''),'') AS last_name,
    COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), '') AS avatar_url,
    'mock' AS action_type,
    COALESCE(NULLIF(ms.started_via_alias, ''), b.slug, '') AS action_detail,
    ms.finished_at AS happened_at
  FROM interview_mock_sessions ms
  JOIN users u ON u.id = ms.user_id
  LEFT JOIN interview_blueprints b ON b.id = ms.blueprint_id
  WHERE ms.user_id IN (SELECT user_id FROM members)
    AND ms.status = 'finished'
    AND ms.finished_at >= $2
  ORDER BY happened_at DESC LIMIT 20
)
ORDER BY happened_at DESC
LIMIT 20`, circleID, weekAgo)
	if err != nil {
		return nil, fmt.Errorf("query recent actions: %w", err)
	}
	defer actionRows.Close()
	for actionRows.Next() {
		var a model.CircleMemberAction
		if err := actionRows.Scan(
			&a.UserID, &a.FirstName, &a.LastName, &a.AvatarURL,
			&a.ActionType, &a.ActionDetail, &a.HappenedAt,
		); err != nil {
			return nil, fmt.Errorf("scan action: %w", err)
		}
		pulse.RecentActions = append(pulse.RecentActions, &a)
	}
	if err := actionRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate actions: %w", err)
	}

	return pulse, nil
}

func (r *Repo) GetCircleMemberStats(ctx context.Context, circleID uuid.UUID) ([]*model.CircleMemberStats, error) {
	rows, err := r.data.DB.Query(ctx, `
SELECT
  cm.user_id,
  COALESCE(NULLIF(u.first_name,''),'') AS first_name,
  COALESCE(NULLIF(u.last_name,''),'') AS last_name,
  COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), '') AS avatar_url,
  cm.role,
  cm.joined_at,
  COALESCE(daily.solved, 0)::int4 AS daily_solved,
  COALESCE(duels.won, 0)::int4 AS duels_won,
  COALESCE(duels.played, 0)::int4 AS duels_played,
  COALESCE(mocks.done, 0)::int4 AS mocks_done,
  COALESCE(aps.rating, 300)::int4 AS arena_rating
FROM circle_members cm
JOIN users u ON u.id = cm.user_id
LEFT JOIN arena_player_stats aps ON aps.user_id = cm.user_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS solved
  FROM interview_practice_sessions s
  WHERE s.user_id = cm.user_id AND s.status = 'finished' AND s.last_submission_passed
) daily ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE ap.is_winner) AS won,
    COUNT(*) AS played
  FROM arena_match_players ap
  JOIN arena_matches am ON am.id = ap.match_id
  WHERE ap.user_id = cm.user_id AND am.status = 3
) duels ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS done
  FROM interview_mock_sessions ms
  WHERE ms.user_id = cm.user_id AND ms.status = 'finished'
) mocks ON true
WHERE cm.circle_id = $1
ORDER BY cm.joined_at ASC`, circleID)
	if err != nil {
		return nil, fmt.Errorf("query member stats: %w", err)
	}
	defer rows.Close()

	stats := make([]*model.CircleMemberStats, 0, 12)
	for rows.Next() {
		var s model.CircleMemberStats
		if err := rows.Scan(
			&s.UserID, &s.FirstName, &s.LastName, &s.AvatarURL,
			&s.Role, &s.JoinedAt,
			&s.DailySolved, &s.DuelsWon, &s.DuelsPlayed, &s.MocksDone,
			&s.ArenaRating,
		); err != nil {
			return nil, fmt.Errorf("scan member stats: %w", err)
		}
		stats = append(stats, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate member stats: %w", err)
	}
	return stats, nil
}

func (r *Repo) CreateCircleChallenge(ctx context.Context, req model.CreateCircleChallengeRequest) (*model.CircleChallenge, error) {
	id := uuid.New()
	if _, err := r.data.DB.Exec(ctx, `
INSERT INTO circle_challenges (id, circle_id, template_key, target_value, starts_at, ends_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, req.CircleID, req.TemplateKey, req.TargetValue, req.StartsAt, req.EndsAt, req.CreatedBy,
	); err != nil {
		return nil, fmt.Errorf("insert circle challenge: %w", err)
	}
	return &model.CircleChallenge{
		ID:          id,
		CircleID:    req.CircleID,
		TemplateKey: req.TemplateKey,
		TargetValue: req.TargetValue,
		StartsAt:    req.StartsAt,
		EndsAt:      req.EndsAt,
		CreatedBy:   req.CreatedBy,
	}, nil
}

func (r *Repo) GetActiveCircleChallenge(ctx context.Context, circleID uuid.UUID) (*model.CircleChallenge, error) {
	var ch model.CircleChallenge
	err := r.data.DB.QueryRow(ctx, `
SELECT id, circle_id, template_key, target_value, starts_at, ends_at, created_by, created_at
FROM circle_challenges
WHERE circle_id = $1 AND ends_at > now() AND starts_at <= now()
ORDER BY created_at DESC
LIMIT 1`, circleID).Scan(
		&ch.ID, &ch.CircleID, &ch.TemplateKey, &ch.TargetValue,
		&ch.StartsAt, &ch.EndsAt, &ch.CreatedBy, &ch.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kratoserrors.NotFound("NO_ACTIVE_CHALLENGE", "no active challenge")
		}
		return nil, fmt.Errorf("get active challenge: %w", err)
	}

	progress, err := r.computeChallengeProgress(ctx, &ch)
	if err != nil {
		return nil, err
	}
	ch.Progress = progress
	return &ch, nil
}

func (r *Repo) computeChallengeProgress(ctx context.Context, ch *model.CircleChallenge) ([]*model.ChallengeMemberProgress, error) {
	var query string
	switch ch.TemplateKey {
	case "daily_completion":
		query = `
SELECT cm.user_id,
  COALESCE(NULLIF(u.first_name,''),''),
  COALESCE(NULLIF(u.last_name,''),''),
  COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), ''),
  COUNT(s.id)::int4 AS current
FROM circle_members cm
JOIN users u ON u.id = cm.user_id
LEFT JOIN interview_practice_sessions s
  ON s.user_id = cm.user_id
  AND s.status = 'finished'
  AND COALESCE(s.finished_at, s.updated_at) BETWEEN $2 AND $3
WHERE cm.circle_id = $1
GROUP BY cm.user_id, u.first_name, u.last_name, u.yandex_avatar_url, u.telegram_avatar_url
ORDER BY current DESC`
	case "duels_count":
		query = `
SELECT cm.user_id,
  COALESCE(NULLIF(u.first_name,''),''),
  COALESCE(NULLIF(u.last_name,''),''),
  COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), ''),
  COUNT(ap.match_id)::int4 AS current
FROM circle_members cm
JOIN users u ON u.id = cm.user_id
LEFT JOIN arena_match_players ap ON ap.user_id = cm.user_id
LEFT JOIN arena_matches am ON am.id = ap.match_id AND am.status = 3
  AND am.finished_at BETWEEN $2 AND $3
WHERE cm.circle_id = $1
GROUP BY cm.user_id, u.first_name, u.last_name, u.yandex_avatar_url, u.telegram_avatar_url
ORDER BY current DESC`
	case "mocks_count":
		query = `
SELECT cm.user_id,
  COALESCE(NULLIF(u.first_name,''),''),
  COALESCE(NULLIF(u.last_name,''),''),
  COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), ''),
  COUNT(ms.id)::int4 AS current
FROM circle_members cm
JOIN users u ON u.id = cm.user_id
LEFT JOIN interview_mock_sessions ms
  ON ms.user_id = cm.user_id
  AND ms.status = 'finished'
  AND ms.finished_at BETWEEN $2 AND $3
WHERE cm.circle_id = $1
GROUP BY cm.user_id, u.first_name, u.last_name, u.yandex_avatar_url, u.telegram_avatar_url
ORDER BY current DESC`
	case "streak_days":
		query = `
SELECT cm.user_id,
  COALESCE(NULLIF(u.first_name,''),''),
  COALESCE(NULLIF(u.last_name,''),''),
  COALESCE(NULLIF(u.yandex_avatar_url,''), NULLIF(u.telegram_avatar_url,''), ''),
  COUNT(DISTINCT DATE(COALESCE(s.finished_at, s.updated_at) AT TIME ZONE 'UTC'))::int4 AS current
FROM circle_members cm
JOIN users u ON u.id = cm.user_id
LEFT JOIN interview_practice_sessions s
  ON s.user_id = cm.user_id
  AND s.status = 'finished'
  AND COALESCE(s.finished_at, s.updated_at) BETWEEN $2 AND $3
WHERE cm.circle_id = $1
GROUP BY cm.user_id, u.first_name, u.last_name, u.yandex_avatar_url, u.telegram_avatar_url
ORDER BY current DESC`
	default:
		return nil, fmt.Errorf("unknown challenge template: %s", ch.TemplateKey)
	}

	rows, err := r.data.DB.Query(ctx, query, ch.CircleID, ch.StartsAt, ch.EndsAt)
	if err != nil {
		return nil, fmt.Errorf("query challenge progress: %w", err)
	}
	defer rows.Close()

	progress := make([]*model.ChallengeMemberProgress, 0, 12)
	for rows.Next() {
		var p model.ChallengeMemberProgress
		if err := rows.Scan(&p.UserID, &p.FirstName, &p.LastName, &p.AvatarURL, &p.Current); err != nil {
			return nil, fmt.Errorf("scan challenge progress: %w", err)
		}
		progress = append(progress, &p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate challenge progress: %w", err)
	}
	return progress, nil
}
