package interviewprep

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/aireview"
)

func TestPassesMockStageReview(t *testing.T) {
	if passesMockStageReview(&aireview.InterviewSolutionReview{
		Score:      6,
		IsRelevant: true,
		IsPassing:  true,
	}) != true {
		t.Fatalf("expected passing review to pass")
	}

	if passesMockStageReview(&aireview.InterviewSolutionReview{
		Score:      9,
		IsRelevant: false,
		IsPassing:  false,
	}) != false {
		t.Fatalf("expected irrelevant review to fail")
	}
}

func TestPassesMockQuestionReview(t *testing.T) {
	if passesMockQuestionReview(&aireview.InterviewAnswerReview{
		Score:      5,
		IsRelevant: true,
		IsPassing:  true,
	}) != false {
		t.Fatalf("expected score below threshold to fail")
	}

	if passesMockQuestionReview(&aireview.InterviewAnswerReview{
		Score:      7,
		IsRelevant: true,
		IsPassing:  true,
	}) != true {
		t.Fatalf("expected strong answer review to pass")
	}
}

func TestIsTransientAIReviewError(t *testing.T) {
	if !isTransientAIReviewError(context.DeadlineExceeded) {
		t.Fatalf("expected deadline exceeded to be transient")
	}
	if !isTransientAIReviewError(errors.New("provider timeout while awaiting response")) {
		t.Fatalf("expected timeout message to be transient")
	}
	if isTransientAIReviewError(errors.New("invalid ai review response")) {
		t.Fatalf("expected validation error to stay non-transient")
	}
}

func TestBoundedAIReviewTimeout(t *testing.T) {
	if got := boundedAIReviewTimeout(0); got != defaultAIReviewTimeout {
		t.Fatalf("expected default timeout for zero value, got %s", got)
	}
	if got := boundedAIReviewTimeout(45 * time.Second); got != 45*time.Second {
		t.Fatalf("expected custom timeout above default to be kept, got %s", got)
	}
	if got := boundedAIReviewTimeout(12 * time.Second); got != 12*time.Second {
		t.Fatalf("expected custom timeout to be kept, got %s", got)
	}
}
