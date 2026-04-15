package mission

// ActivityCounts holds raw counts queried from existing tables for a user on a given day.
// All counts are computed from existing tables — no new writes needed.
type ActivityCounts struct {
	// From code_submissions: correct submissions today in practice rooms
	PracticeTasksSolved int32
	// From code_submissions: total submissions today in practice rooms
	PracticeSubmissions int32
	// From arena_matches: wins today
	ArenaWins int32
	// From arena_matches: total matches today
	ArenaMatches int32
	// From interview_prep_mock_sessions stages: stages completed today
	MockStagesCompleted int32
	// From interview_prep_mock_sessions: full sessions completed today
	MockSessionsCompleted int32
	// From interview_prep_sessions: sessions completed today
	PrepSessionsCompleted int32
	// From code_submissions for daily task: solved today's daily
	DailyChallengeSolved bool
	// Whether the user had any activity today (for streak mission)
	HadActivityToday bool

	// ── Challenge mode counts ──
	// From daily_challenge_results: best AI score today (0 if none)
	DailyAIScore int32
	// From blind_review_sessions: reviews completed today
	BlindReviewsToday int32
	// From blind_review_sessions: best AI score on blind review today
	BlindReviewBestScore int32
	// From user_task_records: new personal bests set today
	NewPBsToday int32
	// From weekly_challenge_entries: has entry for current week
	WeeklyBossAttempted bool
	// From weekly_challenge_entries: best AI score for current week
	WeeklyBossScore int32
}

// resolveProgress maps a mission key to the appropriate activity count.
func resolveProgress(missionKey string, counts *ActivityCounts) int32 {
	if counts == nil {
		return 0
	}
	switch missionKey {
	case "solve_practice_1", "solve_practice_2":
		return counts.PracticeTasksSolved
	case "win_arena_1", "win_arena_2":
		return counts.ArenaWins
	case "mock_stage_1", "mock_stages_2":
		return counts.MockStagesCompleted
	case "maintain_streak":
		if counts.HadActivityToday {
			return 1
		}
		return 0
	case "daily_challenge":
		if counts.DailyChallengeSolved {
			return 1
		}
		return 0
	case "submit_practice_3":
		return counts.PracticeSubmissions
	case "play_arena_2":
		return counts.ArenaMatches
	case "prep_session_1":
		return counts.PrepSessionsCompleted
	case "mock_full_1":
		return counts.MockSessionsCompleted
	case "daily_quality_7":
		if counts.DailyAIScore >= 7 {
			return 1
		}
		return 0
	case "blind_review_1":
		if counts.BlindReviewsToday >= 1 {
			return 1
		}
		return 0
	case "blind_review_qual":
		if counts.BlindReviewBestScore >= 7 {
			return 1
		}
		return 0
	case "beat_pb":
		if counts.NewPBsToday >= 1 {
			return 1
		}
		return 0
	case "weekly_boss":
		if counts.WeeklyBossAttempted {
			return 1
		}
		return 0
	case "weekly_boss_qual":
		if counts.WeeklyBossScore >= 7 {
			return 1
		}
		return 0
	default:
		return 0
	}
}
