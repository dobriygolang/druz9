package profile

import (
	"context"
	"fmt"
	"math"
	"time"

	profiledomain "api/internal/domain/profile"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
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

	checkpoints, err := r.loadProfileCheckpointProgress(ctx, userID)
	if err != nil {
		return nil, err
	}
	progress.Checkpoints = checkpoints

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

	streakDays, err := r.loadProfileProgressStreak(ctx, userID, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	progress.Overview.CurrentStreakDays = streakDays

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
				COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_stages,
				COALESCE(ROUND((AVG(s.review_score) FILTER (WHERE s.status = 'completed'))::numeric, 1), 0)::float8 AS avg_stage_score
			FROM interview_prep_mock_stages s
			JOIN interview_prep_mock_sessions ms ON ms.id = s.session_id
			WHERE ms.user_id = $1
		),
		question_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE qr.answered_at IS NOT NULL) AS answered_questions,
				COALESCE(ROUND((AVG(qr.score) FILTER (WHERE qr.answered_at IS NOT NULL))::numeric, 1), 0)::float8 AS avg_question_score
			FROM interview_prep_mock_stage_question_results qr
			JOIN interview_prep_mock_stages s ON s.id = qr.stage_id
			JOIN interview_prep_mock_sessions ms ON ms.id = s.session_id
			WHERE ms.user_id = $1
		),
		session_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE status = 'finished') AS completed_sessions,
				MAX(finished_at) FILTER (WHERE finished_at IS NOT NULL) AS last_finished_at
			FROM interview_prep_mock_sessions
			WHERE user_id = $1
		),
		practice_metrics AS (
			SELECT
				COUNT(*) FILTER (WHERE s.status = 'finished') AS practice_sessions,
				COUNT(*) FILTER (WHERE s.status = 'finished' AND s.last_submission_passed) AS practice_passed_sessions,
				COUNT(DISTINCT DATE(COALESCE(s.finished_at, s.updated_at, s.started_at) AT TIME ZONE 'UTC'))::int4 AS practice_active_days
			FROM interview_prep_sessions s
			WHERE s.user_id = $1
		),
		last_activity AS (
			SELECT MAX(activity_at) AS last_activity_at
			FROM (
				SELECT finished_at AS activity_at
				FROM interview_prep_mock_sessions
				WHERE user_id = $1 AND finished_at IS NOT NULL
				UNION ALL
				SELECT qr.answered_at AS activity_at
				FROM interview_prep_mock_stage_question_results qr
				JOIN interview_prep_mock_stages s ON s.id = qr.stage_id
				JOIN interview_prep_mock_sessions ms ON ms.id = s.session_id
				WHERE ms.user_id = $1 AND qr.answered_at IS NOT NULL
				UNION ALL
				SELECT COALESCE(s.finished_at, s.updated_at, s.started_at) AS activity_at
				FROM interview_prep_sessions s
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
		return err
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
			s.kind,
			COUNT(*) FILTER (WHERE s.status = 'completed')::int4 AS stage_count,
			COUNT(qr.id) FILTER (WHERE qr.answered_at IS NOT NULL)::int4 AS question_count,
			COALESCE((AVG(s.review_score) FILTER (WHERE s.status = 'completed'))::float8, 0) AS average_stage,
			COALESCE((AVG(qr.score) FILTER (WHERE qr.answered_at IS NOT NULL))::float8, 0) AS average_question
		FROM interview_prep_mock_stages s
		JOIN interview_prep_mock_sessions ms ON ms.id = s.session_id
		LEFT JOIN interview_prep_mock_stage_question_results qr ON qr.stage_id = s.id
		WHERE ms.user_id = $1
		GROUP BY s.kind
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

	checkpointByKey, err := r.loadCheckpointScoresBySkill(ctx, userID)
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
		if checkpointScore := checkpointByKey[skill.Key]; checkpointScore > item.VerifiedScore {
			item.VerifiedScore = checkpointScore
		}
		if item.VerifiedScore == 0 && skill.Key == model.InterviewPrepMockStageKindSlices.String() {
			item.VerifiedScore = arenaVerifiedScore
		}
		item.Score = profiledomain.ComputeBlendedScore(item.VerifiedScore, item.PracticeScore)
		item.Confidence = profiledomain.ComputeConfidence(item.VerifiedScore, item.PracticeDays, item.PracticeSessions)
		items = append(items, item)
	}

	return items, nil
}

func (r *Repo) loadProfileProgressMockSessions(ctx context.Context, userID uuid.UUID) ([]*model.ProfileMockSession, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			ms.id::text,
			BTRIM(ms.company_tag)                                           AS company_tag,
			ms.status,
			ms.current_stage_index,
			COUNT(mst.id)                                                   AS total_stages,
			COALESCE((
				SELECT mst2.kind
				FROM interview_prep_mock_stages mst2
				WHERE mst2.session_id = ms.id
				ORDER BY mst2.created_at ASC
				LIMIT 1 OFFSET ms.current_stage_index
			), '')                                                          AS current_stage_kind
		FROM interview_prep_mock_sessions ms
		LEFT JOIN interview_prep_mock_stages mst ON mst.session_id = ms.id
		WHERE ms.user_id = $1
		  AND NULLIF(BTRIM(ms.company_tag), '') IS NOT NULL
		GROUP BY ms.id, ms.company_tag, ms.status, ms.current_stage_index
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
	return items, rows.Err()
}

func (r *Repo) loadProfileCheckpointProgress(ctx context.Context, userID uuid.UUID) ([]*model.ProfileCheckpointProgress, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			c.id::text,
			c.task_id::text,
			COALESCE(NULLIF(BTRIM(t.title), ''), 'Untitled checkpoint task') AS task_title,
			c.skill_key,
			c.score,
			c.finished_at
		FROM interview_prep_checkpoints c
		JOIN interview_prep_tasks t ON t.id = c.task_id
		WHERE c.user_id = $1
		  AND c.status = 'passed'
		ORDER BY c.finished_at DESC NULLS LAST, c.created_at DESC
		LIMIT 8
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query profile checkpoints: %w", err)
	}
	defer rows.Close()

	items := make([]*model.ProfileCheckpointProgress, 0, 4)
	for rows.Next() {
		item := &model.ProfileCheckpointProgress{}
		var finishedAt pgtype.Timestamptz
		if err := rows.Scan(&item.ID, &item.TaskID, &item.TaskTitle, &item.SkillKey, &item.Score, &finishedAt); err != nil {
			return nil, fmt.Errorf("scan profile checkpoint: %w", err)
		}
		item.SkillLabel = profiledomain.SkillLabel(item.SkillKey)
		if finishedAt.Valid {
			value := finishedAt.Time
			item.FinishedAt = &value
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate profile checkpoints: %w", err)
	}
	return items, nil
}

func (r *Repo) loadProfileProgressStreak(ctx context.Context, userID uuid.UUID, now time.Time) (int32, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT DISTINCT DATE(activity_at AT TIME ZONE 'UTC') AS activity_date
		FROM (
			SELECT finished_at AS activity_at
			FROM interview_prep_mock_sessions
			WHERE user_id = $1 AND finished_at IS NOT NULL
			UNION ALL
			SELECT qr.answered_at AS activity_at
			FROM interview_prep_mock_stage_question_results qr
			JOIN interview_prep_mock_stages s ON s.id = qr.stage_id
			JOIN interview_prep_mock_sessions ms ON ms.id = s.session_id
			WHERE ms.user_id = $1 AND qr.answered_at IS NOT NULL
			UNION ALL
			SELECT COALESCE(s.finished_at, s.updated_at, s.started_at) AS activity_at
			FROM interview_prep_sessions s
			WHERE s.user_id = $1
		) activity
		ORDER BY activity_date DESC
	`, userID)
	if err != nil {
		return 0, fmt.Errorf("query profile streak: %w", err)
	}
	defer rows.Close()

	dates := make([]time.Time, 0, 16)
	for rows.Next() {
		var value time.Time
		if err := rows.Scan(&value); err != nil {
			return 0, fmt.Errorf("scan profile streak date: %w", err)
		}
		dates = append(dates, value.UTC())
	}
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("iterate profile streak dates: %w", err)
	}

	return profiledomain.ComputeCurrentStreak(dates, now.UTC()), nil
}

func (r *Repo) loadPracticeStatsBySkill(ctx context.Context, userID uuid.UUID) (map[string]practiceStats, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			t.prep_type,
			COUNT(*) FILTER (WHERE s.status = 'finished')::int4 AS sessions,
			COUNT(*) FILTER (WHERE s.status = 'finished' AND s.last_submission_passed)::int4 AS passed_sessions,
			COUNT(DISTINCT DATE(COALESCE(s.finished_at, s.updated_at, s.started_at) AT TIME ZONE 'UTC'))::int4 AS active_days
		FROM interview_prep_sessions s
		JOIN interview_prep_tasks t ON t.id = s.task_id
		WHERE s.user_id = $1
		GROUP BY t.prep_type
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
		if err == pgx.ErrNoRows {
			return 0, nil
		}
		return 0, fmt.Errorf("query arena verified score: %w", err)
	}

	if matches == 0 {
		return 0, nil
	}

	return int32(math.Round(math.Min(100, float64(matches)*6+winRate*40))), nil
}

func (r *Repo) loadCheckpointScoresBySkill(ctx context.Context, userID uuid.UUID) (map[string]int32, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			skill_key,
			COALESCE(ROUND(AVG(score))::int4, 0) AS avg_score
		FROM interview_prep_checkpoints
		WHERE user_id = $1
		  AND status = 'passed'
		GROUP BY skill_key
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query checkpoint competencies: %w", err)
	}
	defer rows.Close()

	items := make(map[string]int32, 4)
	for rows.Next() {
		var skillKey string
		var score int32
		if err := rows.Scan(&skillKey, &score); err != nil {
			return nil, fmt.Errorf("scan checkpoint competency: %w", err)
		}
		items[skillKey] = score
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate checkpoint competencies: %w", err)
	}
	return items, nil
}

func (r *Repo) GetDailyActivity(ctx context.Context, userID uuid.UUID, days int) (map[string]int, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT activity_date, SUM(cnt)::int AS total
		FROM (
			SELECT DATE(finished_at AT TIME ZONE 'UTC') AS activity_date, COUNT(*) AS cnt
			FROM interview_prep_mock_sessions
			WHERE user_id = $1
			  AND finished_at IS NOT NULL
			  AND finished_at >= NOW() - make_interval(days => $2)
			GROUP BY 1

			UNION ALL

			SELECT DATE(qr.answered_at AT TIME ZONE 'UTC') AS activity_date, COUNT(*) AS cnt
			FROM interview_prep_mock_stage_question_results qr
			JOIN interview_prep_mock_stages s ON s.id = qr.stage_id
			JOIN interview_prep_mock_sessions ms ON ms.id = s.session_id
			WHERE ms.user_id = $1
			  AND qr.answered_at IS NOT NULL
			  AND qr.answered_at >= NOW() - make_interval(days => $2)
			GROUP BY 1

			UNION ALL

			SELECT DATE(COALESCE(s.finished_at, s.updated_at, s.started_at) AT TIME ZONE 'UTC') AS activity_date, COUNT(*) AS cnt
			FROM interview_prep_sessions s
			WHERE s.user_id = $1
			  AND COALESCE(s.finished_at, s.updated_at, s.started_at) >= NOW() - make_interval(days => $2)
			GROUP BY 1
		) activity
		GROUP BY activity_date
		ORDER BY activity_date
	`, userID, days)
	if err != nil {
		return nil, fmt.Errorf("query daily activity: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int, days)
	for rows.Next() {
		var date time.Time
		var count int
		if err := rows.Scan(&date, &count); err != nil {
			return nil, fmt.Errorf("scan daily activity: %w", err)
		}
		result[date.Format("2006-01-02")] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate daily activity: %w", err)
	}
	return result, nil
}

