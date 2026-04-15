package aireview

import "testing"

func TestParseInterviewSolutionJSONMarksIrrelevantAsNotPassing(t *testing.T) {
	raw := `{
		"score": 8,
		"summary": "Ответ нерелевантен задаче и выглядит как набор слов.",
		"strengths": [],
		"issues": ["Нерелевантный ответ", "Случайный текст"],
		"followUpQuestions": []
	}`

	review, err := parseInterviewSolutionJSON(raw)
	if err != nil {
		t.Fatalf("parseInterviewSolutionJSON() error = %v", err)
	}
	if review.IsRelevant {
		t.Fatalf("expected review to be irrelevant")
	}
	if review.IsPassing {
		t.Fatalf("expected review to be not passing")
	}
}

func TestParseInterviewAnswerJSONUsesPassingThreshold(t *testing.T) {
	raw := `{
		"score": 5,
		"summary": "Ответ частичный и поверхностный.",
		"gaps": ["Не раскрыты ключевые trade-off"]
	}`

	review, err := parseInterviewAnswerJSON(raw)
	if err != nil {
		t.Fatalf("parseInterviewAnswerJSON() error = %v", err)
	}
	if !review.IsRelevant {
		t.Fatalf("expected review to stay relevant")
	}
	if review.IsPassing {
		t.Fatalf("expected score 5 to be not passing")
	}
}
