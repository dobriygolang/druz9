// Package notiftext centralizes all notification text templates.
// All user-facing notification strings live here, not in handlers.
package notiftext

import "fmt"

// ── Arena ────────────────────────────────────────────────────────

func DuelInviteTitle() string { return "Дуэль" }

func DuelInviteBody(displayName, topic string) string {
	if displayName == "" {
		displayName = "Кто-то"
	}
	if topic == "" {
		topic = "Алгоритмы"
	}
	return fmt.Sprintf("%s вызвал тебя на дуэль!\nТема: %s | ~15 мин", displayName, topic)
}

func MatchFoundTitle() string { return "Матч найден" }

func MatchFoundBody(topic string) string {
	if topic == "" {
		topic = "Алгоритмы"
	}
	return fmt.Sprintf("Соперник найден! Тема: %s\nМатч начинается", topic)
}

func DuelResultTitle() string { return "Результат дуэли" }

func DuelResultBody(topic string, isWinner bool, isDraw bool) string {
	if isDraw {
		return fmt.Sprintf("Дуэль завершена вничью. Тема: %s", topic)
	}
	if isWinner {
		return fmt.Sprintf("Ты победил в дуэли! Тема: %s", topic)
	}
	return fmt.Sprintf("Дуэль завершена. Тема: %s", topic)
}

// ── Guilds ──────────────────────────────────────────────────────

func GuildInviteTitle() string { return "Приглашение в круг" }

func GuildInviteBody(displayName string) string {
	if displayName == "" {
		displayName = "Кто-то"
	}
	return fmt.Sprintf("%s пригласил тебя в круг", displayName)
}

func ChallengeCreatedTitle() string { return "Challenge в круге" }

func ChallengeCreatedBody(templateKey string, targetValue int32) string {
	return fmt.Sprintf("Новый challenge: %s (цель: %d)\nСтарт сейчас, 7 дней", templateKey, targetValue)
}

func GuildDigestTitle() string { return "Недельный digest" }

func GuildDigestBody(guildName string, memberCount int) string {
	return fmt.Sprintf("Круг \"%s\" — итоги недели\nУчастников: %d", guildName, memberCount)
}

// ── Interview Prep ───────────────────────────────────────────────

func MockResultTitle() string { return "Mock interview" }

func MockResultBody(blueprintTitle string) string {
	return fmt.Sprintf("Mock interview завершён!\nПрограмма: %s", blueprintTitle)
}

// ── Streaks ──────────────────────────────────────────────────────

func StreakWarningTitle() string { return "Streak под угрозой" }

func StreakWarningBody() string {
	return "Твой streak под угрозой! Заверши хотя бы одну задачу сегодня, чтобы сохранить его."
}
