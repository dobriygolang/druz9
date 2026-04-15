package solutionreview

import (
	"api/internal/model"
	schema "api/internal/realtime/schema"
)

// RealtimeReviewPublisher adapts the CodeEditorHub for the review service.
type RealtimeReviewPublisher struct {
	hub interface {
		PublishReviewReady(userID string, review *schema.CodeEditorReviewEvent)
	}
}

// NewRealtimePublisher creates a publisher that sends reviews via WebSocket.
func NewRealtimePublisher(hub interface {
	PublishReviewReady(userID string, review *schema.CodeEditorReviewEvent)
}) *RealtimeReviewPublisher {
	return &RealtimeReviewPublisher{hub: hub}
}

// PublishReviewReady converts the model review to a realtime event and publishes it.
func (p *RealtimeReviewPublisher) PublishReviewReady(userID string, review *model.SolutionReview) {
	if review == nil || p.hub == nil {
		return
	}

	event := &schema.CodeEditorReviewEvent{
		ReviewID:        review.ID.String(),
		SubmissionID:    review.SubmissionID.String(),
		Status:          string(review.Status),
		Verdict:         string(review.AIVerdict),
		TimeComplexity:  review.AITimeComplexity,
		SpaceComplexity: review.AISpaceComplexity,
		Pattern:         review.AIPattern,
		Strengths:       review.AIStrengths,
		Weaknesses:      review.AIWeaknesses,
		Hint:            review.AIHint,
		SkillSignals:    review.AISkillSignals,
		Comparison:      review.ComparisonSummary,
		AttemptNumber:   review.AttemptNumber,
		SolveTimeMs:     review.SolveTimeMs,
		MedianTimeMs:    review.MedianTimeMs,
	}

	p.hub.PublishReviewReady(userID, event)
}
