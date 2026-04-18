package aireview

import (
	"testing"
)

func TestBuildCodeReviewPrompt(t *testing.T) {
	t.Parallel()
	req := CodeReviewRequest{
		TaskTitle:         "Two Sum",
		TaskStatement:     "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
		TaskPattern:       "hashing",
		TaskOptimalTime:   "O(n)",
		TaskOptimalSpace:  "O(n)",
		TaskDifficulty:    "easy",
		CandidateCode:     "def twoSum(nums, target):\n  for i in range(len(nums)):\n    for j in range(i+1, len(nums)):\n      if nums[i] + nums[j] == target:\n        return [i, j]",
		CandidateLanguage: "python",
		SolveTimeMs:       120000,
		AttemptNumber:     2,
		PassedCount:       15,
		TotalCount:        15,
	}

	prompt := buildCodeReviewPrompt(req)

	// Check prompt contains key elements
	if prompt == "" {
		t.Fatal("prompt should not be empty")
	}
	if !containsSubstring(prompt, "Two Sum") {
		t.Error("prompt should contain task title")
	}
	if !containsSubstring(prompt, "hashing") {
		t.Error("prompt should contain task pattern")
	}
	if !containsSubstring(prompt, "O(n)") {
		t.Error("prompt should contain optimal complexity")
	}
	if !containsSubstring(prompt, "python") {
		t.Error("prompt should contain candidate language")
	}
	if !containsSubstring(prompt, "Попытка #2") {
		t.Error("prompt should contain attempt number")
	}
}

func TestBuildCodeReviewPrompt_WithOpponent(t *testing.T) {
	t.Parallel()
	req := CodeReviewRequest{
		TaskTitle:         "Two Sum",
		TaskStatement:     "Given an array...",
		CandidateCode:     "def solve(): pass",
		CandidateLanguage: "python",
		OpponentCode:      "fn solve() {}",
		OpponentLanguage:  "rust",
		SolveTimeMs:       60000,
		AttemptNumber:     1,
		PassedCount:       10,
		TotalCount:        10,
	}

	prompt := buildCodeReviewPrompt(req)

	if !containsSubstring(prompt, "Решение оппонента") {
		t.Error("prompt should contain opponent section when opponent code is provided")
	}
	if !containsSubstring(prompt, "rust") {
		t.Error("prompt should contain opponent language")
	}
}

func TestBuildCodeReviewPrompt_NoOpponent(t *testing.T) {
	t.Parallel()
	req := CodeReviewRequest{
		TaskTitle:         "Two Sum",
		TaskStatement:     "Given an array...",
		CandidateCode:     "def solve(): pass",
		CandidateLanguage: "python",
		SolveTimeMs:       60000,
		AttemptNumber:     1,
		PassedCount:       10,
		TotalCount:        10,
	}

	prompt := buildCodeReviewPrompt(req)

	if containsSubstring(prompt, "Решение оппонента") {
		t.Error("prompt should NOT contain opponent section when no opponent code")
	}
}

func TestParseCodeReviewJSON_ValidResponse(t *testing.T) {
	t.Parallel()
	raw := `{
		"verdict": "suboptimal",
		"timeComplexity": "O(n^2)",
		"spaceComplexity": "O(1)",
		"pattern": "two_pointers",
		"strengths": ["Correct solution", "Good variable names"],
		"weaknesses": ["Brute force approach", "Missing early exit"],
		"hint": "Use a hash map for O(n) lookup",
		"skillSignals": {"arrays": "moderate", "hashing": "weak"},
		"comparison": ""
	}`

	review, err := parseCodeReviewJSON(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if review.Verdict != "suboptimal" {
		t.Errorf("verdict = %q, want suboptimal", review.Verdict)
	}
	if review.TimeComplexity != "O(n^2)" {
		t.Errorf("timeComplexity = %q, want O(n^2)", review.TimeComplexity)
	}
	if review.Pattern != "two_pointers" {
		t.Errorf("pattern = %q, want two_pointers", review.Pattern)
	}
	if len(review.Strengths) != 2 {
		t.Errorf("strengths count = %d, want 2", len(review.Strengths))
	}
	if len(review.Weaknesses) != 2 {
		t.Errorf("weaknesses count = %d, want 2", len(review.Weaknesses))
	}
	if review.Hint != "Use a hash map for O(n) lookup" {
		t.Errorf("hint = %q, want 'Use a hash map for O(n) lookup'", review.Hint)
	}
	if review.SkillSignals["hashing"] != "weak" {
		t.Errorf("skill signal for hashing = %q, want 'weak'", review.SkillSignals["hashing"])
	}
}

func TestParseCodeReviewJSON_WithMarkdown(t *testing.T) {
	t.Parallel()
	raw := "```json\n{\"verdict\":\"optimal\",\"timeComplexity\":\"O(n)\",\"spaceComplexity\":\"O(n)\",\"pattern\":\"hashing\",\"strengths\":[],\"weaknesses\":[],\"hint\":\"\",\"skillSignals\":{},\"comparison\":\"\"}\n```"

	review, err := parseCodeReviewJSON(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if review.Verdict != "optimal" {
		t.Errorf("verdict = %q, want optimal", review.Verdict)
	}
}

func TestParseCodeReviewJSON_InvalidJSON(t *testing.T) {
	t.Parallel()
	_, err := parseCodeReviewJSON("not json")
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestNormalizeVerdict(t *testing.T) {
	t.Parallel()
	tests := []struct {
		input string
		want  string
	}{
		{"optimal", "optimal"},
		{"OPTIMAL", "optimal"},
		{"good", "good"},
		{"brute_force", "brute_force"},
		{"invalid", "suboptimal"},
		{"", "suboptimal"},
	}
	for _, tt := range tests {
		got := normalizeVerdict(tt.input)
		if got != tt.want {
			t.Errorf("normalizeVerdict(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestNormalizePattern(t *testing.T) {
	t.Parallel()
	tests := []struct {
		input string
		want  string
	}{
		{"two_pointers", "two_pointers"},
		{"DYNAMIC_PROGRAMMING", "dynamic_programming"},
		{"unknown_pattern", "other"},
		{"", "other"},
	}
	for _, tt := range tests {
		got := normalizePattern(tt.input)
		if got != tt.want {
			t.Errorf("normalizePattern(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func containsSubstring(s, substr string) bool {
	return s != "" && substr != "" && contains(s, substr)
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
