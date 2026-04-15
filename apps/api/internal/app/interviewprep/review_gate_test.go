package interviewprep

import (
	"testing"

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
