package profile

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type progressSkillMeta struct {
	label string
	href  string
}

type practiceStats struct {
	sessions       int32
	passedSessions int32
	days           int32
}

var profileProgressSkills = []struct {
	key  string
	meta progressSkillMeta
}{
	{key: model.InterviewPrepMockStageKindSlices.String(), meta: progressSkillMeta{label: "Slices", href: "/interview-prep?category=coding"}},
	{key: model.InterviewPrepMockStageKindConcurrency.String(), meta: progressSkillMeta{label: "Concurrency", href: "/interview-prep?category=coding"}},
	{key: model.InterviewPrepMockStageKindSQL.String(), meta: progressSkillMeta{label: "SQL", href: "/interview-prep?category=sql"}},
	{key: model.InterviewPrepMockStageKindArchitecture.String(), meta: progressSkillMeta{label: "Architecture", href: "/interview-prep?category=system_design"}},
	{key: model.InterviewPrepMockStageKindSystemDesign.String(), meta: progressSkillMeta{label: "System Design", href: "/interview-prep?category=system_design"}},
}

func (r *Repo) GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error) {
	progress := &model.ProfileProgress{
		Competencies: make([]*model.ProfileCompetency, 0, len(profileProgressSkills)),
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
	progress.Strongest, progress.Weakest = splitStrengths(competencies)
	progress.Recommendations = buildProfileRecommendations(progress.Weakest)

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

	verifiedByKey := make(map[string]*model.ProfileCompetency, len(profileProgressSkills))
	for _, skill := range profileProgressSkills {
		verifiedByKey[skill.key] = &model.ProfileCompetency{
			Key:   skill.key,
			Label: skill.meta.label,
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
		item.AverageScore = roundTenth(resolveAverageScore(averageStage, averageQuestion, stageCount, questionCount))
		item.VerifiedScore = computeCompetencyScore(averageStage, averageQuestion, stageCount, questionCount)
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

	items := make([]*model.ProfileCompetency, 0, len(profileProgressSkills))
	for _, skill := range profileProgressSkills {
		item := verifiedByKey[skill.key]
		if item == nil {
			item = &model.ProfileCompetency{
				Key:   skill.key,
				Label: skill.meta.label,
			}
		}
		stats := practiceByKey[skill.key]
		item.PracticeSessions = stats.sessions
		item.PracticePassedSessions = stats.passedSessions
		item.PracticeDays = stats.days
		item.PracticeScore = computePracticeScore(stats.passedSessions, stats.sessions, stats.days)
		if checkpointScore := checkpointByKey[skill.key]; checkpointScore > item.VerifiedScore {
			item.VerifiedScore = checkpointScore
		}
		if item.VerifiedScore == 0 && skill.key == model.InterviewPrepMockStageKindSlices.String() {
			item.VerifiedScore = arenaVerifiedScore
		}
		item.Score = computeBlendedScore(item.VerifiedScore, item.PracticeScore)
		item.Confidence = computeConfidence(item.VerifiedScore, item.PracticeDays, item.PracticeSessions)
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
		item.SkillLabel = profileSkillLabel(item.SkillKey)
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

	return computeCurrentStreak(dates, now.UTC()), nil
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
		for _, key := range mapPrepTypeToCompetencyKeys(prepType) {
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

func computeCompetencyScore(avgStage, avgQuestion float64, stageCount, questionCount int32) int32 {
	weighted := resolveAverageScore(avgStage, avgQuestion, stageCount, questionCount)
	return int32(math.Round(weighted * 10))
}

func computePracticeScore(passedSessions, sessions, practiceDays int32) int32 {
	if sessions == 0 {
		return 0
	}
	passRate := float64(passedSessions) / float64(sessions)
	volumeFactor := math.Min(1, float64(sessions)/6)
	dayFactor := math.Min(1, float64(practiceDays)/3)
	return int32(math.Round((passRate*0.65 + volumeFactor*0.2 + dayFactor*0.15) * 100))
}

func computeBlendedScore(verifiedScore, practiceScore int32) int32 {
	switch {
	case verifiedScore > 0 && practiceScore > 0:
		return int32(math.Round(float64(verifiedScore)*0.75 + float64(practiceScore)*0.25))
	case verifiedScore > 0:
		return verifiedScore
	case practiceScore > 0:
		return int32(math.Round(float64(practiceScore) * 0.35))
	default:
		return 0
	}
}

func computeConfidence(verifiedScore, practiceDays, practiceSessions int32) string {
	switch {
	case verifiedScore > 0:
		return "verified"
	case practiceDays >= 3:
		return "medium"
	case practiceSessions > 0:
		return "low"
	default:
		return "low"
	}
}

func resolveAverageScore(avgStage, avgQuestion float64, stageCount, questionCount int32) float64 {
	switch {
	case stageCount > 0 && questionCount > 0:
		return avgStage*0.6 + avgQuestion*0.4
	case stageCount > 0:
		return avgStage
	case questionCount > 0:
		return avgQuestion
	default:
		return 0
	}
}

func splitStrengths(items []*model.ProfileCompetency) ([]*model.ProfileCompetency, []*model.ProfileCompetency) {
	rated := make([]*model.ProfileCompetency, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		if item.StageCount == 0 && item.QuestionCount == 0 && item.PracticeSessions == 0 {
			continue
		}
		rated = append(rated, item)
	}
	if len(rated) == 0 {
		return []*model.ProfileCompetency{}, []*model.ProfileCompetency{}
	}

	sort.SliceStable(rated, func(i, j int) bool {
		if rated[i].Score == rated[j].Score {
			return rated[i].Label < rated[j].Label
		}
		return rated[i].Score > rated[j].Score
	})
	strongest := append([]*model.ProfileCompetency(nil), rated[:minInt(3, len(rated))]...)

	sort.SliceStable(rated, func(i, j int) bool {
		if rated[i].Score == rated[j].Score {
			return rated[i].Label < rated[j].Label
		}
		return rated[i].Score < rated[j].Score
	})
	weakest := append([]*model.ProfileCompetency(nil), rated[:minInt(3, len(rated))]...)

	return strongest, weakest
}

func buildProfileRecommendations(weakest []*model.ProfileCompetency) []*model.ProfileProgressRecommendation {
	items := make([]*model.ProfileProgressRecommendation, 0, len(weakest))
	for _, competency := range weakest {
		if competency == nil || competency.Key == "" {
			continue
		}
		items = append(items, &model.ProfileProgressRecommendation{
			Key:         competency.Key,
			Title:       recommendationTitle(competency.Key, competency.Label),
			Description: recommendationDescription(competency),
			Href:        recommendationHref(competency.Key),
		})
	}
	return items
}

func recommendationTitle(key, fallback string) string {
	switch key {
	case model.InterviewPrepMockStageKindSQL.String():
		return "Добить SQL-блок"
	case model.InterviewPrepMockStageKindConcurrency.String():
		return "Прокачать concurrency"
	case model.InterviewPrepMockStageKindArchitecture.String():
		return "Усилить architecture thinking"
	case model.InterviewPrepMockStageKindSystemDesign.String():
		return "Подтянуть system design"
	case model.InterviewPrepMockStageKindSlices.String():
		return "Стабилизировать coding flow"
	default:
		return "Продолжить " + fallback
	}
}

func recommendationDescription(item *model.ProfileCompetency) string {
	if item == nil {
		return ""
	}
	if item.Confidence != "verified" && item.PracticeSessions > 0 && item.PracticeDays < 3 {
		return fmt.Sprintf("По зоне %s уже есть practice, но confidence пока %s. Нужны еще независимые дни, чтобы сигнал стал устойчивее.", item.Label, item.Confidence)
	}
	if item.Confidence != "verified" && item.PracticeDays >= 3 {
		return fmt.Sprintf("По зоне %s уже собран practice volume. Следующий mock interview или checkpoint переведет ее в verified skill.", item.Label)
	}
	if item.StageCount == 0 && item.QuestionCount == 0 {
		return "Здесь еще нет попыток. Стоит добавить хотя бы один mock stage, чтобы получить реальный baseline."
	}
	return fmt.Sprintf("Текущий confidence по зоне %s: %d/100. Следующий mock или тематическая задача даст самый заметный прирост именно здесь.", item.Label, item.Score)
}

func recommendationHref(key string) string {
	for _, skill := range profileProgressSkills {
		if skill.key == key {
			return skill.meta.href
		}
	}
	return "/interview-prep"
}

func profileSkillLabel(key string) string {
	for _, skill := range profileProgressSkills {
		if skill.key == key {
			return skill.meta.label
		}
	}
	return key
}

func computeCurrentStreak(dates []time.Time, now time.Time) int32 {
	if len(dates) == 0 {
		return 0
	}

	today := truncateDateUTC(now)
	current := truncateDateUTC(dates[0])
	if current.Before(today.AddDate(0, 0, -1)) {
		return 0
	}

	streak := int32(1)
	for i := 1; i < len(dates); i++ {
		prev := truncateDateUTC(dates[i-1])
		next := truncateDateUTC(dates[i])
		if prev.AddDate(0, 0, -1).Equal(next) {
			streak++
			continue
		}
		break
	}

	return streak
}

func truncateDateUTC(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func roundTenth(value float64) float64 {
	return math.Round(value*10) / 10
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
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

func mapPrepTypeToCompetencyKeys(prepType string) []string {
	switch model.InterviewPrepTypeFromString(prepType) {
	case model.InterviewPrepTypeCoding, model.InterviewPrepTypeAlgorithm:
		return []string{model.InterviewPrepMockStageKindSlices.String()}
	case model.InterviewPrepTypeSQL:
		return []string{model.InterviewPrepMockStageKindSQL.String()}
	case model.InterviewPrepTypeSystemDesign:
		return []string{model.InterviewPrepMockStageKindSystemDesign.String()}
	case model.InterviewPrepTypeCodeReview:
		return []string{model.InterviewPrepMockStageKindArchitecture.String()}
	default:
		return nil
	}
}
