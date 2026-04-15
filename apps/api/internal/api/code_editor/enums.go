package code_editor

import (
	"api/internal/model"
	v1 "api/pkg/api/code_editor/v1"
)

func mapReviewSourceType(sourceType model.ReviewSourceType) v1.ReviewSourceType {
	switch sourceType {
	case model.ReviewSourceDaily:
		return v1.ReviewSourceType_REVIEW_SOURCE_TYPE_DAILY
	case model.ReviewSourcePractice:
		return v1.ReviewSourceType_REVIEW_SOURCE_TYPE_PRACTICE
	case model.ReviewSourceDuel:
		return v1.ReviewSourceType_REVIEW_SOURCE_TYPE_DUEL
	case model.ReviewSourceMock:
		return v1.ReviewSourceType_REVIEW_SOURCE_TYPE_MOCK
	default:
		return v1.ReviewSourceType_REVIEW_SOURCE_TYPE_UNSPECIFIED
	}
}

func mapReviewStatus(status model.ReviewStatus) v1.ReviewStatus {
	switch status {
	case model.ReviewStatusPending:
		return v1.ReviewStatus_REVIEW_STATUS_PENDING
	case model.ReviewStatusReady:
		return v1.ReviewStatus_REVIEW_STATUS_READY
	case model.ReviewStatusFailed:
		return v1.ReviewStatus_REVIEW_STATUS_FAILED
	default:
		return v1.ReviewStatus_REVIEW_STATUS_UNSPECIFIED
	}
}

func mapAIVerdict(verdict model.AIVerdict) v1.AIVerdict {
	switch verdict {
	case model.AIVerdictOptimal:
		return v1.AIVerdict_AI_VERDICT_OPTIMAL
	case model.AIVerdictGood:
		return v1.AIVerdict_AI_VERDICT_GOOD
	case model.AIVerdictSuboptimal:
		return v1.AIVerdict_AI_VERDICT_SUBOPTIMAL
	case model.AIVerdictBruteForce:
		return v1.AIVerdict_AI_VERDICT_BRUTE_FORCE
	default:
		return v1.AIVerdict_AI_VERDICT_UNSPECIFIED
	}
}
