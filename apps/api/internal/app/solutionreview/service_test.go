package solutionreview

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"api/internal/aireview"
	"api/internal/model"
)

// --- Mock Repository ---

type mockRepo struct {
	mu      sync.Mutex
	reviews map[uuid.UUID]*model.SolutionReview
	counts  map[string]int
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		reviews: make(map[uuid.UUID]*model.SolutionReview),
		counts:  make(map[string]int),
	}
}

func (m *mockRepo) Create(_ context.Context, review *model.SolutionReview) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.reviews[review.ID] = review
	key := review.UserID.String() + ":" + review.TaskID.String()
	m.counts[key]++
	return nil
}

func (m *mockRepo) UpdateAIReview(_ context.Context, reviewID uuid.UUID, ai *model.SolutionReview) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.reviews[reviewID]; ok {
		existing.Status = ai.Status
		existing.AIVerdict = ai.AIVerdict
		existing.AIPattern = ai.AIPattern
		existing.AIStrengths = ai.AIStrengths
		existing.AIWeaknesses = ai.AIWeaknesses
		existing.AIHint = ai.AIHint
		existing.AITimeComplexity = ai.AITimeComplexity
		existing.AISpaceComplexity = ai.AISpaceComplexity
		existing.AIProvider = ai.AIProvider
		existing.AIModel = ai.AIModel
		existing.AISkillSignals = ai.AISkillSignals
		existing.ComparisonSummary = ai.ComparisonSummary
		existing.OpponentSubmissionID = ai.OpponentSubmissionID
	}
	return nil
}

func (m *mockRepo) MarkFailed(_ context.Context, reviewID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.reviews[reviewID]; ok {
		existing.Status = model.ReviewStatusFailed
	}
	return nil
}

func (m *mockRepo) GetBySubmission(_ context.Context, submissionID uuid.UUID) (*model.SolutionReview, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, r := range m.reviews {
		if r.SubmissionID == submissionID {
			return r, nil
		}
	}
	return nil, nil
}

func (m *mockRepo) GetByID(_ context.Context, id uuid.UUID) (*model.SolutionReview, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.reviews[id], nil
}

func (m *mockRepo) CountUserAttempts(_ context.Context, userID, taskID uuid.UUID) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := userID.String() + ":" + taskID.String()
	return m.counts[key], nil
}

func (m *mockRepo) GetTaskStats(_ context.Context, taskID uuid.UUID) (*model.TaskStats, error) {
	return &model.TaskStats{TaskID: taskID, MedianSolveTimeMs: 60000, TotalSolves: 10}, nil
}

func (m *mockRepo) UpsertTaskStats(_ context.Context, _ uuid.UUID) error { return nil }

func (m *mockRepo) ListByUser(_ context.Context, _ uuid.UUID, _ int) ([]*model.SolutionReview, error) {
	return nil, nil
}

// --- Mock AI Reviewer ---

type mockCodeReviewer struct {
	result *aireview.CodeReview
	err    error
}

func (m *mockCodeReviewer) ReviewCode(_ context.Context, _ aireview.CodeReviewRequest) (*aireview.CodeReview, error) {
	return m.result, m.err
}

// --- Tests ---

func TestStartReview_CreatesLevel1Immediately(t *testing.T) {
	repo := newMockRepo()
	svc := New(Config{
		Repo:     repo,
		Reviewer: nil, // no AI reviewer
	})

	userID := uuid.New()
	taskID := uuid.New()
	subID := uuid.New()

	reviewID, err := svc.StartReview(t.Context(), ReviewInput{
		SubmissionID: subID,
		UserID:       userID,
		TaskID:       taskID,
		SourceType:   model.ReviewSourcePractice,
		IsCorrect:    false,
		SolveTimeMs:  30000,
		PassedCount:  8,
		TotalCount:   15,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if reviewID == uuid.Nil {
		t.Fatal("expected non-nil review ID")
	}

	// Check review was persisted
	review, _ := repo.GetBySubmission(t.Context(), subID)
	if review == nil {
		t.Fatal("review should exist in repo")
	}
	if review.AttemptNumber != 1 {
		t.Errorf("attempt number = %d, want 1", review.AttemptNumber)
	}
	if review.MedianTimeMs != 60000 {
		t.Errorf("median time = %d, want 60000", review.MedianTimeMs)
	}
	if review.IsCorrect {
		t.Error("review should not be correct")
	}
}

func TestStartReview_TriggersAIForAccepted(t *testing.T) {
	repo := newMockRepo()
	reviewer := &mockCodeReviewer{
		result: &aireview.CodeReview{
			Verdict:         "optimal",
			TimeComplexity:  "O(n)",
			SpaceComplexity: "O(n)",
			Pattern:         "hashing",
			Strengths:       []string{"Clean code"},
			Weaknesses:      []string{},
			Hint:            "",
			Provider:        "gemini",
			Model:           "gemini-flash",
		},
	}

	svc := New(Config{
		Repo:     repo,
		Reviewer: reviewer,
	})

	userID := uuid.New()
	taskID := uuid.New()
	subID := uuid.New()

	_, err := svc.StartReview(t.Context(), ReviewInput{
		SubmissionID:  subID,
		UserID:        userID,
		TaskID:        taskID,
		SourceType:    model.ReviewSourceDaily,
		IsCorrect:     true,
		SolveTimeMs:   45000,
		PassedCount:   15,
		TotalCount:    15,
		Code:          "def solve(): pass",
		Language:      "python",
		TaskTitle:     "Two Sum",
		TaskStatement: "Given an array...",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Wait for async review goroutine
	time.Sleep(200 * time.Millisecond)

	review, _ := repo.GetBySubmission(t.Context(), subID)
	if review == nil {
		t.Fatal("review should exist")
	}
	if review.Status != model.ReviewStatusReady {
		t.Errorf("status = %q, want ready", review.Status)
	}
	if review.AIVerdict != model.AIVerdictOptimal {
		t.Errorf("verdict = %q, want optimal", review.AIVerdict)
	}
	if review.AIPattern != "hashing" {
		t.Errorf("pattern = %q, want hashing", review.AIPattern)
	}
}

func TestRateLimiting(t *testing.T) {
	svc := New(Config{
		Repo:     newMockRepo(),
		Reviewer: &mockCodeReviewer{},
	})

	userID := uuid.New()

	// First 5 should be allowed
	for i := range 5 {
		if !svc.isRateAllowed(userID) {
			t.Errorf("attempt %d should be allowed", i+1)
		}
	}

	// 6th should be denied
	if svc.isRateAllowed(userID) {
		t.Error("6th attempt should be rate limited")
	}
}

func TestAttemptCounting(t *testing.T) {
	repo := newMockRepo()
	svc := New(Config{Repo: repo})

	userID := uuid.New()
	taskID := uuid.New()

	// First attempt
	_, _ = svc.StartReview(t.Context(), ReviewInput{
		SubmissionID: uuid.New(),
		UserID:       userID,
		TaskID:       taskID,
		SourceType:   model.ReviewSourcePractice,
		IsCorrect:    false,
	})

	// Second attempt
	_, _ = svc.StartReview(t.Context(), ReviewInput{
		SubmissionID: uuid.New(),
		UserID:       userID,
		TaskID:       taskID,
		SourceType:   model.ReviewSourcePractice,
		IsCorrect:    false,
	})

	// Check the second review has attempt_number = 2
	var found int
	for _, r := range repo.reviews {
		if r.UserID == userID && r.AttemptNumber == 2 {
			found++
		}
	}
	if found == 0 {
		t.Error("second attempt should have attempt_number = 2")
	}
}
