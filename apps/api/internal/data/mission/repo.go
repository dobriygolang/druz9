package mission

import (
	"context"
	"fmt"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"

	missiondomain "api/internal/domain/mission"
	"api/internal/storage/postgres"
)

// Repo implements mission data operations using existing tables.
type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

// NewRepo creates a new mission repository.
func NewRepo(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

// GetActivityCounts queries existing tables for a user's activity on a given date.
// All counts are read-only — no new rows are written.
func (r *Repo) GetActivityCounts(ctx context.Context, userID uuid.UUID, date time.Time) (*missiondomain.ActivityCounts, error) {
	dayStart := time.Date(date.UTC().Year(), date.UTC().Month(), date.UTC().Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	counts := &missiondomain.ActivityCounts{}

	// Practice: correct submissions and total submissions today from practice rooms.
	err := r.data.DB.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN cs.is_correct THEN 1 ELSE 0 END), 0),
			COUNT(*)
		FROM code_submissions cs
		JOIN code_rooms cr ON cr.id = cs.room_id
		WHERE cs.user_id = $1
		  AND cs.submitted_at >= $2
		  AND cs.submitted_at < $3
		  AND cr.mode != 2
	`, userID, dayStart, dayEnd).Scan(&counts.PracticeTasksSolved, &counts.PracticeSubmissions)
	if err != nil {
		return nil, fmt.Errorf("query practice counts: %w", err)
	}

	// Arena: wins and total matches today.
	err = r.data.DB.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN am.winner_user_id = $1 THEN 1 ELSE 0 END), 0),
			COUNT(*)
		FROM arena_matches am
		JOIN arena_match_players amp ON amp.match_id = am.id AND amp.user_id = $1
		WHERE am.status = 3
		  AND am.finished_at >= $2
		  AND am.finished_at < $3
	`, userID, dayStart, dayEnd).Scan(&counts.ArenaWins, &counts.ArenaMatches)
	if err != nil {
		return nil, fmt.Errorf("query arena counts: %w", err)
	}

	// Mock stages completed today.
	err = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM interview_prep_mock_stages ms
		JOIN interview_prep_mock_sessions mss ON mss.id = ms.session_id
		WHERE mss.user_id = $1
		  AND ms.status = 'finished'
		  AND ms.finished_at >= $2
		  AND ms.finished_at < $3
	`, userID, dayStart, dayEnd).Scan(&counts.MockStagesCompleted)
	if err != nil {
		return nil, fmt.Errorf("query mock stages: %w", err)
	}

	// Full mock sessions completed today.
	err = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM interview_prep_mock_sessions
		WHERE user_id = $1
		  AND status = 'finished'
		  AND finished_at >= $2
		  AND finished_at < $3
	`, userID, dayStart, dayEnd).Scan(&counts.MockSessionsCompleted)
	if err != nil {
		return nil, fmt.Errorf("query mock sessions: %w", err)
	}

	// Prep sessions completed today.
	err = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM interview_prep_sessions
		WHERE user_id = $1
		  AND status = 'finished'
		  AND finished_at >= $2
		  AND finished_at < $3
	`, userID, dayStart, dayEnd).Scan(&counts.PrepSessionsCompleted)
	if err != nil {
		return nil, fmt.Errorf("query prep sessions: %w", err)
	}

	// Had any activity today (for streak mission).
	counts.HadActivityToday = counts.PracticeSubmissions > 0 ||
		counts.ArenaMatches > 0 ||
		counts.MockStagesCompleted > 0 ||
		counts.PrepSessionsCompleted > 0

	// Check daily challenge via explicit completion in user_mission_completions.
	periodKey := missiondomain.PeriodKeyForDate(date)
	var dcCount int32
	err = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM user_mission_completions
		WHERE user_id = $1
		  AND mission_key = 'daily_challenge'
		  AND period_key = $2
	`, userID, periodKey).Scan(&dcCount)
	if err != nil {
		return nil, fmt.Errorf("query daily challenge completion: %w", err)
	}
	counts.DailyChallengeSolved = dcCount > 0

	// ── Challenge mode counts (from new game mode tables) ──

	// Daily AI score
	_ = r.data.DB.QueryRow(ctx, `
		SELECT COALESCE(ai_score, 0) FROM daily_challenge_results
		WHERE user_id = $1 AND challenge_date = CURRENT_DATE
	`, userID).Scan(&counts.DailyAIScore)

	// Blind reviews today
	_ = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(MAX(ai_score), 0)
		FROM blind_review_sessions
		WHERE user_id = $1 AND submitted_at >= $2 AND submitted_at < $3
	`, userID, dayStart, dayEnd).Scan(&counts.BlindReviewsToday, &counts.BlindReviewBestScore)

	// New PBs today
	_ = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_task_records
		WHERE user_id = $1 AND last_attempt_at >= $2 AND last_attempt_at < $3
	`, userID, dayStart, dayEnd).Scan(&counts.NewPBsToday)

	// Weekly boss
	weekYear, weekNum := date.UTC().ISOWeek()
	weekKey := fmt.Sprintf("%d-W%02d", weekYear, weekNum)
	var wceCount int32
	_ = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(MAX(ai_score), 0) FROM weekly_challenge_entries
		WHERE user_id = $1 AND week_key = $2
	`, userID, weekKey).Scan(&wceCount, &counts.WeeklyBossScore)
	counts.WeeklyBossAttempted = wceCount > 0

	return counts, nil
}

// GetCompletions returns the set of mission keys completed by the user for a period.
func (r *Repo) GetCompletions(ctx context.Context, userID uuid.UUID, periodKey string) (map[string]bool, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT mission_key
		FROM user_mission_completions
		WHERE user_id = $1
		  AND period_key = $2
	`, userID, periodKey)
	if err != nil {
		return nil, fmt.Errorf("query completions: %w", err)
	}
	defer rows.Close()

	result := make(map[string]bool)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, fmt.Errorf("scan completion: %w", err)
		}
		result[key] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}
	return result, nil
}

// RecordCompletion inserts a mission completion record (idempotent via ON CONFLICT).
func (r *Repo) RecordCompletion(ctx context.Context, userID uuid.UUID, missionKey, periodKey string) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO user_mission_completions (user_id, mission_key, period_key, completed_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (user_id, mission_key, period_key) DO NOTHING
	`, userID, missionKey, periodKey)
	if err != nil {
		return fmt.Errorf("record completion: %w", err)
	}
	return nil
}
