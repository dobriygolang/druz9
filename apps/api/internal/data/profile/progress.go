package profile

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	profiledomain "api/internal/domain/profile"
	"api/internal/model"
)

type practiceStats struct {
	sessions       int32
	passedSessions int32
	days           int32
}

func (r *Repo) GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error) {
	progress := &model.ProfileProgress{
		Competencies: make([]*model.ProfileCompetency, 0, len(profiledomain.ProgressSkills)),
		Strongest:    []*model.ProfileCompetency{},
		Weakest:      []*model.ProfileCompetency{},
		Checkpoints:  []*model.ProfileCheckpointProgress{},
		Companies:    []string{},
	}

	if err := r.loadProfileProgressOverview(ctx, userID, &progress.Overview); err != nil {
		return nil, err
	}

	competencies, err := r.loadProfileCompetencies(ctx, userID)
	if err != nil {
		return nil, err
	}
	progress.Competencies = competencies
	progress.Strongest, progress.Weakest = profiledomain.SplitStrengths(competencies)
	progress.Recommendations = profiledomain.BuildProfileRecommendations(progress.Weakest)

	mockSessions, err := r.loadProfileProgressMockSessions(ctx, userID)
	if err != nil {
		return nil, err
	}
	progress.MockSessions = mockSessions
	seen := make(map[string]struct{}, len(mockSessions))
	for _, s := range mockSessions {
		if _, ok := seen[s.CompanyTag]; !ok {
			seen[s.CompanyTag] = struct{}{}
			progress.Companies = append(progress.Companies, s.CompanyTag)
		}
	}

	streakDays, longestStreak, err := r.loadProfileProgressStreak(ctx, userID, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	progress.Overview.CurrentStreakDays = streakDays
	progress.Overview.LongestStreakDays = longestStreak

	// Compute user-level XP and level
	totalXP := profiledomain.ComputeUserXP(&progress.Overview)
	level, levelProgress := profiledomain.ComputeUserLevel(totalXP)
	progress.Overview.TotalXP = totalXP
	progress.Overview.Level = level
	progress.Overview.LevelProgress = levelProgress

	// Compute activity percentile
	percentile, err := r.loadActivityPercentile(ctx, userID)
	if err != nil {
		return nil, err
	}
	progress.Overview.ActivityPercentile = percentile

	goal, err := r.LoadUserGoal(ctx, userID)
	if err != nil {
		return nil, err
	}
	progress.Goal = goal
	progress.NextActions = profiledomain.ComputeNextActions(competencies, goal, streakDays)

	return progress, nil
}

func (r *Repo) loadProfileProgressOverview(ctx context.Context, userID uuid.UUID, overview *model.ProfileProgressOverview) error {
	if overview == nil {
		return nil
	}

	var lastActivity pgtype.Timestamptz
	if err := r.data.DB.QueryRow(ctx, `
		WITH stage_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE r.status = 'completed') AS completed_stages,
				COALESCE(ROUND((AVG(r.review_score) FILTER (WHERE r.status = 'completed'))::numeric, 1), 0)::float8 AS avg_stage_score
			FROM interview_mock_rounds r
			JOIN interview_mock_sessions ms ON ms.id = r.session_id
			WHERE ms.user_id = $1
		),
		question_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE f.answered_at IS NOT NULL) AS answered_questions,
				COALESCE(ROUND((AVG(f.score) FILTER (WHERE f.answered_at IS NOT NULL))::numeric, 1), 0)::float8 AS avg_question_score
			FROM interview_mock_round_followups f
			JOIN interview_mock_rounds r ON r.id = f.round_id
			JOIN interview_mock_sessions ms ON ms.id = r.session_id
			WHERE ms.user_id = $1
		),
		session_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE status = 'finished') AS completed_sessions,
				MAX(finished_at) FILTER (WHERE finished_at IS NOT NULL) AS last_finished_at
			FROM interview_mock_sessions
			WHERE user_id = $1
		),
		practice_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE s.status = 'finished') AS practice_sessions,
				COUNT(*) FILTER (WHERE s.status = 'finished' AND s.last_submission_passed) AS practice_passed_sessions,
				COUNT(DISTINCT DATE(COALESCE(s.finished_at, s.updated_at, s.started_at) AT TIME ZONE 'UTC'))::int4 AS practice_active_days
			FROM interview_practice_sessions s
			WHERE s.user_id = $1
		),
		last_activity AS (
			SELECT MAX(activity_at) AS last_activity_at
			FROM (
				SELECT finished_at AS activity_at
				FROM interview_mock_sessions
				WHERE user_id = $1 AND finished_at IS NOT NULL
				UNION ALL
				SELECT f.answered_at AS activity_at
				FROM interview_mock_round_followups f
				JOIN interview_mock_rounds r ON r.id = f.round_id
				JOIN interview_mock_sessions ms ON ms.id = r.session_id
				WHERE ms.user_id = $1 AND f.answered_at IS NOT NULL
				UNION ALL
				SELECT COALESCE(s.finished_at, s.updated_at, s.started_at) AS activity_at
				FROM interview_practice_sessions s
				WHERE s.user_id = $1
			) activity
		)
		SELECT
			COALESCE(pm.practice_sessions, 0),
			COALESCE(pm.practice_passed_sessions, 0),
			COALESCE(pm.practice_active_days, 0),
			COALESCE(sm.completed_sessions, 0),
			COALESCE(stm.completed_stages, 0),
			COALESCE(qm.answered_questions, 0),
			COALESCE(stm.avg_stage_score, 0),
			COALESCE(qm.avg_question_score, 0),
			la.last_activity_at
		FROM session_metrics sm
		CROSS JOIN stage_metrics stm
		CROSS JOIN question_metrics qm
		CROSS JOIN practice_metrics pm
		CROSS JOIN last_activity la
	`, userID).Scan(
		&overview.PracticeSessions,
		&overview.PracticePassedSessions,
		&overview.PracticeActiveDays,
		&overview.CompletedMockSessions,
		&overview.CompletedMockStages,
		&overview.AnsweredQuestions,
		&overview.AverageStageScore,
		&overview.AverageQuestionScore,
		&lastActivity,
	); err != nil {
		return fmt.Errorf("load profile progress overview: %w", err)
	}
	if lastActivity.Valid {
		value := lastActivity.Time
		overview.LastActivityAt = &value
	}
	return nil
}

func (r *Repo) loadProfileCompetencies(ctx context.Context, userID uuid.UUID) ([]*model.ProfileCompetency, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			CASE
				WHEN r.round_type = 'coding_algorithmic' THEN 'slices'
				WHEN r.round_type IN ('behavioral', 'code_review') THEN 'architecture'
				WHEN r.round_type = 'sql' THEN 'sql'
				WHEN r.round_type = 'system_design' THEN 'system_design'
				ELSE 'concurrency'
			END AS skill_key,
			COUNT(*) FILTER (WHERE r.status = 'completed')::int4 AS stage_count,
			COUNT(f.id) FILTER (WHERE f.answered_at IS NOT NULL)::int4 AS question_count,
			COALESCE((AVG(r.review_score) FILTER (WHERE r.status = 'completed'))::float8, 0) AS average_stage,
			COALESCE((AVG(f.score) FILTER (WHERE f.answered_at IS NOT NULL))::float8, 0) AS average_question
		FROM interview_mock_rounds r
		JOIN interview_mock_sessions ms ON ms.id = r.session_id
		LEFT JOIN interview_mock_round_followups f ON f.round_id = r.id
		WHERE ms.user_id = $1
		GROUP BY 1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query profile competencies: %w", err)
	}
	defer rows.Close()

	verifiedByKey := make(map[string]*model.ProfileCompetency, len(profiledomain.ProgressSkills))
	for _, skill := range profiledomain.ProgressSkills {
		verifiedByKey[skill.Key] = &model.ProfileCompetency{
			Key:   skill.Key,
			Label: skill.Meta.Label,
		}
	}

	for rows.Next() {
		var key string
		var stageCount int32
		var questionCount int32
		var averageStage float64
		var averageQuestion float64
		if err := rows.Scan(&key, &stageCount, &questionCount, &averageStage, &averageQuestion); err != nil {
			return nil, fmt.Errorf("scan profile competency: %w", err)
		}
		item := verifiedByKey[key]
		if item == nil {
			item = &model.ProfileCompetency{Key: key, Label: key}
			verifiedByKey[key] = item
		}
		item.StageCount = stageCount
		item.QuestionCount = questionCount
		item.AverageScore = profiledomain.RoundTenth(profiledomain.ResolveAverageScore(averageStage, averageQuestion, stageCount, questionCount))
		item.VerifiedScore = profiledomain.ComputeCompetencyScore(averageStage, averageQuestion, stageCount, questionCount)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate profile competencies: %w", err)
	}

	practiceByKey, err := r.loadPracticeStatsBySkill(ctx, userID)
	if err != nil {
		return nil, err
	}

	arenaVerifiedScore, err := r.loadArenaVerifiedScore(ctx, userID)
	if err != nil {
		return nil, err
	}

	items := make([]*model.ProfileCompetency, 0, len(profiledomain.ProgressSkills))
	for _, skill := range profiledomain.ProgressSkills {
		item := verifiedByKey[skill.Key]
		if item == nil {
			item = &model.ProfileCompetency{
				Key:   skill.Key,
				Label: skill.Meta.Label,
			}
		}
		stats := practiceByKey[skill.Key]
		item.PracticeSessions = stats.sessions
		item.PracticePassedSessions = stats.passedSessions
		item.PracticeDays = stats.days
		item.PracticeScore = profiledomain.ComputePracticeScore(stats.passedSessions, stats.sessions, stats.days)
		if item.VerifiedScore == 0 && skill.Key == model.InterviewPrepMockStageKindSlices.String() {
			item.VerifiedScore = arenaVerifiedScore
		}
		item.Score = profiledomain.ComputeBlendedScore(item.VerifiedScore, item.PracticeScore)
		item.Confidence = profiledomain.ComputeConfidence(item.VerifiedScore, item.PracticeDays, item.PracticeSessions)
		level, levelProgress := profiledomain.ComputeLevel(item)
		item.Level = level
		item.LevelProgress = levelProgress
		item.NextMilestone = profiledomain.ComputeNextMilestone(item)
		items = append(items, item)
	}

	return items, nil
}

func (r *Repo) loadProfileProgressMockSessions(ctx context.Context, userID uuid.UUID) ([]*model.ProfileMockSession, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			ms.id::text,
			COALESCE(NULLIF(BTRIM(ms.started_via_alias), ''), b.slug, '')   AS company_tag,
			ms.status,
			ms.current_round_index,
			COUNT(r.id)                                                     AS total_stages,
			COALESCE((
				SELECT CASE
					WHEN r2.round_type = 'coding_algorithmic' THEN 'slices'
					WHEN r2.round_type IN ('behavioral', 'code_review') THEN 'architecture'
					WHEN r2.round_type = 'sql' THEN 'sql'
					WHEN r2.round_type = 'system_design' THEN 'system_design'
					ELSE 'concurrency'
				END
				FROM interview_mock_rounds r2
				WHERE r2.session_id = ms.id
				ORDER BY r2.round_index ASC
				LIMIT 1 OFFSET ms.current_round_index
			), '')                                                          AS current_stage_kind
		FROM interview_mock_sessions ms
		LEFT JOIN interview_blueprints b ON b.id = ms.blueprint_id
		LEFT JOIN interview_mock_rounds r ON r.session_id = ms.id
		WHERE ms.user_id = $1
		  AND NULLIF(BTRIM(COALESCE(ms.started_via_alias, b.slug, '')), '') IS NOT NULL
		GROUP BY ms.id, ms.started_via_alias, b.slug, ms.status, ms.current_round_index
		ORDER BY ms.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query profile mock sessions: %w", err)
	}
	defer rows.Close()

	items := make([]*model.ProfileMockSession, 0, 8)
	for rows.Next() {
		var s model.ProfileMockSession
		if err := rows.Scan(&s.ID, &s.CompanyTag, &s.Status, &s.CurrentStageIndex, &s.TotalStages, &s.CurrentStageKind); err != nil {
			return nil, fmt.Errorf("scan profile mock session: %w", err)
		}
		items = append(items, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate profile mock sessions: %w", err)
	}
	return items, nil
}

// GetStreakStats exposes the streak computation (used by the streak
// package's shield-protection layer) without dragging in the full
// ProfileProgress pipeline.
func (r *Repo) GetStreakStats(ctx context.Context, userID uuid.UUID, now time.Time) (current, longest int32, lastActiveAt *time.Time, err error) {
	dates, err := r.queryProfileStreakDates(ctx, userID)
	if err != nil {
		return 0, 0, nil, err
	}
	current = profiledomain.ComputeCurrentStreak(dates, now.UTC())
	longest = profiledomain.ComputeLongestStreak(dates)
	if len(dates) > 0 {
		t := dates[0] // sorted DESC, so first is most recent
		lastActiveAt = &t
	}
	current = r.applyShieldRestore(ctx, userID, current, now)
	if current > longest {
		longest = current
	}
	return current, longest, lastActiveAt, nil
}

// applyShieldRestore bumps the computed streak when the user recently
// consumed a shield. Formula: the shield's `last_used_at` must fall
// within the CURRENT activity window (today back `current` days); if so
// the effective streak becomes `last_restored_to + (current - 1)`, i.e.
// the pre-break chain picks up from the shield day and each subsequent
// active day still stacks. If the user breaks again after the shield,
// `current` drops to 0 and the shield no longer applies.
//
// Returns `current` unchanged when no shield row exists, `last_used_at`
// is NULL, the shield has expired out of the window, or the restore
// value is not higher than what dates already show.
func (r *Repo) applyShieldRestore(ctx context.Context, userID uuid.UUID, current int32, now time.Time) int32 {
	if current <= 0 {
		return current
	}
	var lastUsedAt *time.Time
	var restoredTo *int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT last_used_at, last_restored_to
		FROM user_streak_shields
		WHERE user_id = $1
	`, userID).Scan(&lastUsedAt, &restoredTo)
	if err != nil || lastUsedAt == nil || restoredTo == nil || *restoredTo <= 0 {
		return current
	}
	today := profiledomain.TruncateDateUTC(now)
	shieldDay := profiledomain.TruncateDateUTC(*lastUsedAt)
	// shield day must sit inside the active streak window [today-(current-1) .. today]
	windowStart := today.AddDate(0, 0, -int(current-1))
	if shieldDay.Before(windowStart) || shieldDay.After(today) {
		return current
	}
	effective := *restoredTo + current - 1
	if effective > current {
		return effective
	}
	return current
}

// queryProfileStreakDates extracts the date-list query from the legacy
// loadProfileProgressStreak so both callers share the same SQL.
func (r *Repo) queryProfileStreakDates(ctx context.Context, userID uuid.UUID) ([]time.Time, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT DISTINCT DATE(activity_at AT TIME ZONE 'UTC') AS activity_date
		FROM (
			SELECT finished_at AS activity_at
			FROM interview_mock_sessions
			WHERE user_id = $1 AND finished_at IS NOT NULL
			UNION ALL
			SELECT f.answered_at AS activity_at
			FROM interview_mock_round_followups f
			JOIN interview_mock_rounds r ON r.id = f.round_id
			JOIN interview_mock_sessions ms ON ms.id = r.session_id
			WHERE ms.user_id = $1 AND f.answered_at IS NOT NULL
			UNION ALL
			SELECT COALESCE(s.finished_at, s.updated_at, s.started_at) AS activity_at
			FROM interview_practice_sessions s
			WHERE s.user_id = $1
		) activity
		ORDER BY activity_date DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query profile streak: %w", err)
	}
	defer rows.Close()

	dates := make([]time.Time, 0, 16)
	for rows.Next() {
		var value time.Time
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("scan profile streak date: %w", err)
		}
		dates = append(dates, value.UTC())
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate profile streak dates: %w", err)
	}
	return dates, nil
}

func (r *Repo) loadProfileProgressStreak(ctx context.Context, userID uuid.UUID, now time.Time) (current, longest int32, err error) {
	dates, err := r.queryProfileStreakDates(ctx, userID)
	if err != nil {
		return 0, 0, err
	}
	current = profiledomain.ComputeCurrentStreak(dates, now.UTC())
	longest = profiledomain.ComputeLongestStreak(dates)
	current = r.applyShieldRestore(ctx, userID, current, now)
	if current > longest {
		longest = current
	}
	return current, longest, nil
}

func (r *Repo) loadPracticeStatsBySkill(ctx context.Context, userID uuid.UUID) (map[string]practiceStats, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			CASE
				WHEN i.round_type = 'coding_algorithmic' THEN 'algorithm'
				WHEN i.round_type = 'sql' THEN 'sql'
				WHEN i.round_type = 'system_design' THEN 'system_design'
				WHEN i.round_type = 'code_review' THEN 'code_review'
				WHEN i.round_type = 'behavioral' THEN 'behavioral'
				ELSE 'coding'
			END AS prep_type,
			COUNT(*) FILTER (WHERE s.status = 'finished')::int4 AS sessions,
			COUNT(*) FILTER (WHERE s.status = 'finished' AND s.last_submission_passed)::int4 AS passed_sessions,
			COUNT(DISTINCT DATE(COALESCE(s.finished_at, s.updated_at, s.started_at) AT TIME ZONE 'UTC'))::int4 AS active_days
		FROM interview_practice_sessions s
		JOIN interview_items i ON i.id = s.item_id
		WHERE s.user_id = $1
		GROUP BY 1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query practice competencies: %w", err)
	}
	defer rows.Close()

	items := make(map[string]practiceStats, 4)
	for rows.Next() {
		var prepType string
		var sessions int32
		var passedSessions int32
		var days int32
		if err := rows.Scan(&prepType, &sessions, &passedSessions, &days); err != nil {
			return nil, fmt.Errorf("scan practice competency: %w", err)
		}
		for _, key := range profiledomain.MapPrepTypeToCompetencyKeys(prepType) {
			stat := items[key]
			stat.sessions += sessions
			stat.passedSessions += passedSessions
			if days > stat.days {
				stat.days = days
			}
			items[key] = stat
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate practice competencies: %w", err)
	}
	return items, nil
}

func (r *Repo) loadArenaVerifiedScore(ctx context.Context, userID uuid.UUID) (int32, error) {
	var matches int32
	var winRate float64
	if err := r.data.DB.QueryRow(ctx, `
		SELECT
			COALESCE(matches, 0)::int4,
			CASE
				WHEN COALESCE(matches, 0) = 0 THEN 0
				ELSE COALESCE(wins, 0)::float8 / NULLIF(matches, 0)::float8
			END
		FROM arena_player_stats
		WHERE user_id = $1
	`, userID).Scan(&matches, &winRate); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("query arena verified score: %w", err)
	}

	if matches == 0 {
		return 0, nil
	}

	return int32(math.Round(math.Min(100, float64(matches)*6+winRate*40))), nil
}

// LoadUserGoal reads the user's goal from the users table.
func (r *Repo) LoadUserGoal(ctx context.Context, userID uuid.UUID) (*model.UserGoal, error) {
	var kind, company string
	err := r.data.DB.QueryRow(ctx, `
		SELECT COALESCE(goal_kind, 'general_growth'), COALESCE(goal_company, '')
		FROM users WHERE id = $1
	`, userID).Scan(&kind, &company)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &model.UserGoal{Kind: "general_growth"}, nil
		}
		return nil, fmt.Errorf("load user goal: %w", err)
	}
	return &model.UserGoal{Kind: kind, Company: company}, nil
}

// SaveUserGoal persists the user's goal.
func (r *Repo) SaveUserGoal(ctx context.Context, userID uuid.UUID, goal *model.UserGoal) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE users SET goal_kind = $2, goal_company = $3, updated_at = NOW() WHERE id = $1
	`, userID, goal.Kind, goal.Company)
	if err != nil {
		return fmt.Errorf("save user goal: %w", err)
	}
	return nil
}

// loadActivityPercentile computes the user's 30-day activity percentile among all users.
func (r *Repo) loadActivityPercentile(ctx context.Context, userID uuid.UUID) (int32, error) {
	var percentile float64
	err := r.data.DB.QueryRow(ctx, `
		WITH user_activity AS (
			SELECT u.id,
				(
					SELECT COUNT(DISTINCT DATE(activity_at AT TIME ZONE 'UTC'))
					FROM (
						SELECT finished_at AS activity_at FROM interview_mock_sessions
						WHERE user_id = u.id AND finished_at IS NOT NULL AND finished_at >= NOW() - INTERVAL '30 days'
						UNION ALL
						SELECT COALESCE(s.finished_at, s.updated_at, s.started_at) AS activity_at
						FROM interview_practice_sessions s
						WHERE s.user_id = u.id AND COALESCE(s.finished_at, s.updated_at, s.started_at) >= NOW() - INTERVAL '30 days'
					) a
				) AS active_days
			FROM users u
			WHERE u.status = 2
		)
		SELECT COALESCE(PERCENT_RANK() OVER (ORDER BY active_days), 0)
		FROM user_activity
		WHERE id = $1
	`, userID).Scan(&percentile)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("load activity percentile: %w", err)
	}
	return int32(math.Round(percentile * 100)), nil
}

// GetProfileFeed returns the most recent activity events for a user.
func (r *Repo) GetProfileFeed(ctx context.Context, userID uuid.UUID, limit int) ([]*model.FeedItem, error) {
	if limit <= 0 {
		limit = 7
	}
	rows, err := r.data.DB.Query(ctx, `
		SELECT type, title, description, score, ts
		FROM (
			SELECT
				'mock_stage' AS type,
				COALESCE(NULLIF(BTRIM(ms.started_via_alias), ''), b.slug, 'Mock') || ' — ' ||
					CASE r.round_type
						WHEN 'coding_algorithmic' THEN 'Algorithms'
						WHEN 'sql' THEN 'SQL'
						WHEN 'system_design' THEN 'System Design'
						WHEN 'code_review' THEN 'Code Review'
						WHEN 'behavioral' THEN 'Behavioral'
						ELSE 'Coding'
					END AS title,
				'Stage ' || (r.round_index + 1) || '/' || (
					SELECT COUNT(*) FROM interview_mock_rounds r2 WHERE r2.session_id = ms.id
				) AS description,
				r.review_score::int4 AS score,
				r.updated_at AS ts
			FROM interview_mock_rounds r
			JOIN interview_mock_sessions ms ON ms.id = r.session_id
			LEFT JOIN interview_blueprints b ON b.id = ms.blueprint_id
			WHERE ms.user_id = $1 AND r.status = 'completed'

			UNION ALL

			SELECT
				'practice' AS type,
				CASE i.round_type
					WHEN 'coding_algorithmic' THEN 'Algorithms'
					WHEN 'sql' THEN 'SQL'
					WHEN 'system_design' THEN 'System Design'
					WHEN 'code_review' THEN 'Code Review'
					ELSE 'Coding'
				END || ' practice' AS title,
				CASE WHEN s.last_submission_passed THEN 'Solved' ELSE 'Attempted' END AS description,
				NULL::int4 AS score,
				COALESCE(s.finished_at, s.updated_at) AS ts
			FROM interview_practice_sessions s
			JOIN interview_items i ON i.id = s.item_id
			WHERE s.user_id = $1 AND s.status = 'finished'
		) feed
		WHERE ts IS NOT NULL
		ORDER BY ts DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("query profile feed: %w", err)
	}
	defer rows.Close()

	items := make([]*model.FeedItem, 0, limit)
	for rows.Next() {
		var item model.FeedItem
		var score *int32
		if err := rows.Scan(&item.Type, &item.Title, &item.Description, &score, &item.Timestamp); err != nil {
			return nil, fmt.Errorf("scan profile feed item: %w", err)
		}
		item.Score = score
		items = append(items, &item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate profile feed items: %w", err)
	}
	return items, nil
}
