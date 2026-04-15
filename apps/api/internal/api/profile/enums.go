package profile

import (
	profiledomain "api/internal/domain/profile"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func mapUserGoalKind(kind string) v1.UserGoalKind {
	switch kind {
	case "general_growth":
		return v1.UserGoalKind_USER_GOAL_KIND_GENERAL_GROWTH
	case "weakest_first":
		return v1.UserGoalKind_USER_GOAL_KIND_WEAKEST_FIRST
	case "company_prep":
		return v1.UserGoalKind_USER_GOAL_KIND_COMPANY_PREP
	default:
		return v1.UserGoalKind_USER_GOAL_KIND_UNSPECIFIED
	}
}

func unmapUserGoalKind(kind v1.UserGoalKind) string {
	switch kind {
	case v1.UserGoalKind_USER_GOAL_KIND_GENERAL_GROWTH:
		return "general_growth"
	case v1.UserGoalKind_USER_GOAL_KIND_WEAKEST_FIRST:
		return "weakest_first"
	case v1.UserGoalKind_USER_GOAL_KIND_COMPANY_PREP:
		return "company_prep"
	default:
		return ""
	}
}

func goalKindOrDefault(kind v1.UserGoalKind) string {
	value := unmapUserGoalKind(kind)
	if value == "" {
		return "general_growth"
	}
	return value
}

func mapProfileActionType(actionType string) v1.ProfileActionType {
	switch actionType {
	case "practice":
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_PRACTICE
	case "mock":
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_MOCK
	case "daily":
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_DAILY
	case "duel":
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_DUEL
	case "checkpoint":
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_CHECKPOINT
	case "arena":
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_ARENA
	default:
		return v1.ProfileActionType_PROFILE_ACTION_TYPE_UNSPECIFIED
	}
}

func mapReadinessLevel(level string) v1.ReadinessLevel {
	switch profiledomain.ReadinessLevel(level) {
	case profiledomain.ReadinessLevelNovice:
		return v1.ReadinessLevel_READINESS_LEVEL_NOVICE
	case profiledomain.ReadinessLevelFoundation:
		return v1.ReadinessLevel_READINESS_LEVEL_FOUNDATION
	case profiledomain.ReadinessLevelPractitioner:
		return v1.ReadinessLevel_READINESS_LEVEL_PRACTITIONER
	case profiledomain.ReadinessLevelCandidate:
		return v1.ReadinessLevel_READINESS_LEVEL_CANDIDATE
	case profiledomain.ReadinessLevelReady:
		return v1.ReadinessLevel_READINESS_LEVEL_READY
	default:
		return v1.ReadinessLevel_READINESS_LEVEL_UNSPECIFIED
	}
}

func mapCompetencyConfidence(confidence string) v1.ProfileCompetencyConfidence {
	switch confidence {
	case "low":
		return v1.ProfileCompetencyConfidence_PROFILE_COMPETENCY_CONFIDENCE_LOW
	case "medium":
		return v1.ProfileCompetencyConfidence_PROFILE_COMPETENCY_CONFIDENCE_MEDIUM
	case "verified":
		return v1.ProfileCompetencyConfidence_PROFILE_COMPETENCY_CONFIDENCE_VERIFIED
	default:
		return v1.ProfileCompetencyConfidence_PROFILE_COMPETENCY_CONFIDENCE_UNSPECIFIED
	}
}

func mapCompetencyLevel(level string) v1.ProfileCompetencyLevel {
	switch level {
	case "beginner":
		return v1.ProfileCompetencyLevel_PROFILE_COMPETENCY_LEVEL_BEGINNER
	case "confident":
		return v1.ProfileCompetencyLevel_PROFILE_COMPETENCY_LEVEL_CONFIDENT
	case "strong":
		return v1.ProfileCompetencyLevel_PROFILE_COMPETENCY_LEVEL_STRONG
	case "expert":
		return v1.ProfileCompetencyLevel_PROFILE_COMPETENCY_LEVEL_EXPERT
	default:
		return v1.ProfileCompetencyLevel_PROFILE_COMPETENCY_LEVEL_UNSPECIFIED
	}
}

func mapAchievementCategory(category string) v1.AchievementCategory {
	switch category {
	case "practice":
		return v1.AchievementCategory_ACHIEVEMENT_CATEGORY_PRACTICE
	case "streak":
		return v1.AchievementCategory_ACHIEVEMENT_CATEGORY_STREAK
	default:
		return v1.AchievementCategory_ACHIEVEMENT_CATEGORY_UNSPECIFIED
	}
}

func mapAchievementTier(tier string) v1.AchievementTier {
	switch tier {
	case "bronze":
		return v1.AchievementTier_ACHIEVEMENT_TIER_BRONZE
	case "silver":
		return v1.AchievementTier_ACHIEVEMENT_TIER_SILVER
	case "gold":
		return v1.AchievementTier_ACHIEVEMENT_TIER_GOLD
	case "diamond":
		return v1.AchievementTier_ACHIEVEMENT_TIER_DIAMOND
	default:
		return v1.AchievementTier_ACHIEVEMENT_TIER_UNSPECIFIED
	}
}

func mapFeedItemType(itemType string) v1.FeedItemType {
	switch itemType {
	case "mock_stage":
		return v1.FeedItemType_FEED_ITEM_TYPE_MOCK_STAGE
	case "practice":
		return v1.FeedItemType_FEED_ITEM_TYPE_PRACTICE
	default:
		return v1.FeedItemType_FEED_ITEM_TYPE_UNSPECIFIED
	}
}

func mapCompetency(c *model.ProfileCompetency) *v1.ProfileCompetency {
	if c == nil {
		return nil
	}
	return &v1.ProfileCompetency{
		Key:                    c.Key,
		Label:                  c.Label,
		Score:                  c.Score,
		PracticeScore:          c.PracticeScore,
		VerifiedScore:          c.VerifiedScore,
		StageCount:             c.StageCount,
		QuestionCount:          c.QuestionCount,
		PracticeSessions:       c.PracticeSessions,
		PracticePassedSessions: c.PracticePassedSessions,
		PracticeDays:           c.PracticeDays,
		Confidence:             mapCompetencyConfidence(c.Confidence),
		AverageScore:           c.AverageScore,
		Level:                  mapCompetencyLevel(c.Level),
		LevelProgress:          c.LevelProgress,
		NextMilestone:          c.NextMilestone,
		ScoreDelta_30D:         c.ScoreDelta30d,
	}
}
