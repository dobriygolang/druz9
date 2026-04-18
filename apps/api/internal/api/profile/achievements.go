package profile

import (
	"context"
	"fmt"
	"time"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// achievementDef is the static catalog entry for a single achievement.
// progressFn returns (current, target). earned when current >= target.
type achievementDef struct {
	id          string
	title       string
	description string
	rarity      string
	progressFn  func(o *overview) (int32, int32)
}

type overview struct {
	PracticeSessions      int32
	CompletedMockSessions int32
	CompletedMockStages   int32
	AnsweredQuestions     int32
	CurrentStreakDays     int32
	LongestStreakDays     int32
	Level                 int32
	TotalXP               int32
	LastActivityAt        *time.Time
}

var achievementCatalog = []achievementDef{
	{
		id:          "first_practice",
		title:       "Первый удар",
		description: "Заверши одну практическую сессию",
		rarity:      "common",
		progressFn:  func(o *overview) (int32, int32) { return o.PracticeSessions, 1 },
	},
	{
		id:          "practice_streak_10",
		title:       "Упорный послушник",
		description: "10 практических сессий",
		rarity:      "common",
		progressFn:  func(o *overview) (int32, int32) { return o.PracticeSessions, 10 },
	},
	{
		id:          "practice_streak_50",
		title:       "Боец арены",
		description: "50 практических сессий",
		rarity:      "rare",
		progressFn:  func(o *overview) (int32, int32) { return o.PracticeSessions, 50 },
	},
	{
		id:          "first_mock",
		title:       "Испытание разума",
		description: "Пройти первое mock-собеседование",
		rarity:      "rare",
		progressFn:  func(o *overview) (int32, int32) { return o.CompletedMockSessions, 1 },
	},
	{
		id:          "mock_veteran",
		title:       "Ветеран собеседований",
		description: "Пройти 10 mock-интервью",
		rarity:      "epic",
		progressFn:  func(o *overview) (int32, int32) { return o.CompletedMockSessions, 10 },
	},
	{
		id:          "week_warrior",
		title:       "Недельный страж",
		description: "Держи серию 7 дней подряд",
		rarity:      "rare",
		progressFn:  func(o *overview) (int32, int32) { return o.LongestStreakDays, 7 },
	},
	{
		id:          "month_of_fire",
		title:       "Месяц пламени",
		description: "Серия 30 дней",
		rarity:      "epic",
		progressFn:  func(o *overview) (int32, int32) { return o.LongestStreakDays, 30 },
	},
	{
		id:          "level_5",
		title:       "Оруженосец",
		description: "Достигни 5 уровня",
		rarity:      "common",
		progressFn:  func(o *overview) (int32, int32) { return o.Level, 5 },
	},
	{
		id:          "level_10",
		title:       "Рыцарь знаний",
		description: "Достигни 10 уровня",
		rarity:      "rare",
		progressFn:  func(o *overview) (int32, int32) { return o.Level, 10 },
	},
	{
		id:          "level_25",
		title:       "Магистр алгоритмов",
		description: "Достигни 25 уровня",
		rarity:      "legendary",
		progressFn:  func(o *overview) (int32, int32) { return o.Level, 25 },
	},
	{
		id:          "hundred_questions",
		title:       "Сто вопросов",
		description: "Ответь на 100 вопросов",
		rarity:      "rare",
		progressFn:  func(o *overview) (int32, int32) { return o.AnsweredQuestions, 100 },
	},
	{
		id:          "thousand_xp",
		title:       "Искра героя",
		description: "Набери 1000 опыта",
		rarity:      "common",
		progressFn:  func(o *overview) (int32, int32) { return o.TotalXP, 1000 },
	},
}

func (i *Implementation) ListProfileAchievements(ctx context.Context, req *v1.ListProfileAchievementsRequest) (*v1.ListProfileAchievementsResponse, error) {
	userID, err := apihelpers.ParseUUID(req.UserId, "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, err
	}

	progress, err := i.progressRepo.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, err
	}

	ov := &overview{
		PracticeSessions:      progress.Overview.PracticeSessions,
		CompletedMockSessions: progress.Overview.CompletedMockSessions,
		CompletedMockStages:   progress.Overview.CompletedMockStages,
		AnsweredQuestions:     progress.Overview.AnsweredQuestions,
		CurrentStreakDays:     progress.Overview.CurrentStreakDays,
		LongestStreakDays:     progress.Overview.LongestStreakDays,
		Level:                 progress.Overview.Level,
		TotalXP:               progress.Overview.TotalXP,
		LastActivityAt:        progress.Overview.LastActivityAt,
	}

	out := make([]*v1.ProfileAchievement, 0, len(achievementCatalog))
	for _, def := range achievementCatalog {
		current, target := def.progressFn(ov)
		if target <= 0 {
			target = 1
		}
		pct := int32(0)
		var earnedAt *timestamppb.Timestamp
		if current >= target {
			pct = 100
			if ov.LastActivityAt != nil {
				earnedAt = timestamppb.New(*ov.LastActivityAt)
			}
		} else if current > 0 {
			pct = int32(float64(current) / float64(target) * 100)
			if pct > 99 {
				pct = 99
			}
		}
		out = append(out, &v1.ProfileAchievement{
			Id:          def.id,
			Title:       def.title,
			Description: fmt.Sprintf("%s (%d/%d)", def.description, min32(current, target), target),
			Rarity:      def.rarity,
			EarnedAt:    earnedAt,
			Progress:    pct,
		})
	}

	return &v1.ListProfileAchievementsResponse{Achievements: out}, nil
}

func min32(a, b int32) int32 {
	if a < b {
		return a
	}
	return b
}
