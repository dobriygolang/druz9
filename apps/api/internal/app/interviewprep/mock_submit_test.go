package interviewprep

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"api/internal/aireview"
	"api/internal/model"
)

func TestSubmitMockStageRetriesTransientAIReviewAndSucceeds(t *testing.T) {
	t.Parallel()
	repo, user, sessionID, stageID := newMockSubmitTestFixture()
	reviewer := &mockSubmitTestReviewer{
		errs: []error{
			errors.New("provider timeout while awaiting response"),
			nil,
		},
		reviews: []*aireview.InterviewSolutionReview{
			nil,
			{
				Score:      8,
				Summary:    "Strong SQL answer.",
				IsRelevant: true,
				IsPassing:  true,
			},
		},
	}

	service := New(Config{
		Repository: repo,
		Reviewer:   reviewer,
	})

	result, err := service.SubmitMockStage(t.Context(), user, sessionID, "SELECT 1", "sql", "", "")
	if err != nil {
		t.Fatalf("SubmitMockStage returned error: %v", err)
	}
	if reviewer.calls != 2 {
		t.Fatalf("expected 2 review attempts, got %d", reviewer.calls)
	}
	if result == nil || !result.Passed {
		t.Fatalf("expected passing result after retry, got %+v", result)
	}
	if len(repo.updateCalls) != 1 {
		t.Fatalf("expected 1 stage update, got %d", len(repo.updateCalls))
	}
	call := repo.updateCalls[0]
	if call.stageID != stageID {
		t.Fatalf("expected stage %s, got %s", stageID, call.stageID)
	}
	if !call.passed {
		t.Fatalf("expected submission to be stored as passed")
	}
	if call.nextStatus != model.InterviewPrepMockStageStatusQuestions {
		t.Fatalf("expected next status questions, got %s", call.nextStatus)
	}
	if call.reviewSummary != "Strong SQL answer." {
		t.Fatalf("unexpected review summary: %q", call.reviewSummary)
	}
}

func TestSubmitMockStageTimeoutPreservesPreviousStageState(t *testing.T) {
	t.Parallel()
	repo, user, sessionID, stageID := newMockSubmitTestFixture()
	repo.stage.LastSubmissionPassed = true
	repo.stage.ReviewScore = 7
	repo.stage.ReviewSummary = "Previous passing review"

	reviewer := &mockSubmitTestReviewer{
		errs: []error{
			errors.New("provider timeout while awaiting response"),
			errors.New("provider timeout while awaiting response"),
		},
		reviews: []*aireview.InterviewSolutionReview{nil, nil},
	}

	service := New(Config{
		Repository: repo,
		Reviewer:   reviewer,
	})

	_, err := service.SubmitMockStage(t.Context(), user, sessionID, "SELECT 42", "sql", "", "")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected deadline exceeded, got %v", err)
	}
	if reviewer.calls != 2 {
		t.Fatalf("expected 2 review attempts, got %d", reviewer.calls)
	}
	if len(repo.updateCalls) != 1 {
		t.Fatalf("expected 1 stage update, got %d", len(repo.updateCalls))
	}
	call := repo.updateCalls[0]
	if call.stageID != stageID {
		t.Fatalf("expected stage %s, got %s", stageID, call.stageID)
	}
	if !call.passed {
		t.Fatalf("expected previous pass flag to be preserved")
	}
	if call.reviewScore != 7 {
		t.Fatalf("expected previous review score to be preserved, got %d", call.reviewScore)
	}
	if call.reviewSummary != "Previous passing review" {
		t.Fatalf("expected previous summary to be preserved, got %q", call.reviewSummary)
	}
	if call.nextStatus != model.InterviewPrepMockStageStatusSolving {
		t.Fatalf("expected stage to stay solving, got %s", call.nextStatus)
	}
	if call.code != "SELECT 42" {
		t.Fatalf("expected latest code to be persisted, got %q", call.code)
	}
}

type mockSubmitUpdateCall struct {
	stageID       uuid.UUID
	solveLanguage string
	code          string
	passed        bool
	reviewScore   int32
	reviewSummary string
	nextStatus    model.InterviewPrepMockStageStatus
}

type mockSubmitTestRepo struct {
	session     *model.InterviewPrepMockSession
	stage       *model.InterviewPrepMockStage
	task        *model.InterviewPrepTask
	updateCalls []mockSubmitUpdateCall
}

func newMockSubmitTestFixture() (*mockSubmitTestRepo, *model.User, uuid.UUID, uuid.UUID) {
	now := time.Now().UTC()
	userID := uuid.New()
	sessionID := uuid.New()
	stageID := uuid.New()
	taskID := uuid.New()

	task := &model.InterviewPrepTask{
		ID:                 taskID,
		Title:              "SQL stage",
		Statement:          "Write SQL",
		Language:           "sql",
		SupportedLanguages: []string{"sql"},
		IsExecutable:       false,
	}
	stage := &model.InterviewPrepMockStage{
		ID:            stageID,
		SessionID:     sessionID,
		StageIndex:    0,
		Kind:          model.InterviewPrepMockStageKindSQL,
		Status:        model.InterviewPrepMockStageStatusSolving,
		TaskID:        taskID,
		SolveLanguage: "sql",
		Code:          "SELECT user_id FROM orders;",
		StartedAt:     now,
		CreatedAt:     now,
		UpdatedAt:     now,
		Task:          task,
		QuestionResults: []*model.InterviewPrepMockQuestionResult{
			{ID: uuid.New(), StageID: stageID, Position: 1, Prompt: "followup"},
		},
	}
	session := &model.InterviewPrepMockSession{
		ID:                sessionID,
		UserID:            userID,
		Status:            model.InterviewPrepMockSessionStatusActive,
		CurrentStageIndex: 0,
		StartedAt:         now,
		CreatedAt:         now,
		UpdatedAt:         now,
		Stages:            []*model.InterviewPrepMockStage{stage},
	}

	return &mockSubmitTestRepo{
			session: session,
			stage:   stage,
			task:    task,
		},
		&model.User{ID: userID},
		sessionID,
		stageID
}

func (r *mockSubmitTestRepo) ListActiveTasks(context.Context) ([]*model.InterviewPrepTask, error) {
	panic("unexpected call to ListActiveTasks")
}

func (r *mockSubmitTestRepo) GetTask(_ context.Context, taskID uuid.UUID) (*model.InterviewPrepTask, error) {
	if r.task != nil && r.task.ID == taskID {
		return r.task, nil
	}
	//nolint:nilnil // Test fake mirrors repository not-found behavior.
	return nil, nil
}

func (r *mockSubmitTestRepo) ListQuestionsByTask(context.Context, uuid.UUID) ([]*model.InterviewPrepQuestion, error) {
	panic("unexpected call to ListQuestionsByTask")
}

func (r *mockSubmitTestRepo) GetQuestionByID(context.Context, uuid.UUID) (*model.InterviewPrepQuestion, error) {
	panic("unexpected call to GetQuestionByID")
}

func (r *mockSubmitTestRepo) GetQuestionByTaskAndPosition(context.Context, uuid.UUID, int32) (*model.InterviewPrepQuestion, error) {
	panic("unexpected call to GetQuestionByTaskAndPosition")
}

func (r *mockSubmitTestRepo) CreateSession(context.Context, *model.InterviewPrepSession) error {
	panic("unexpected call to CreateSession")
}

func (r *mockSubmitTestRepo) GetSession(context.Context, uuid.UUID) (*model.InterviewPrepSession, error) {
	panic("unexpected call to GetSession")
}

func (r *mockSubmitTestRepo) GetActiveSessionByUserAndTask(context.Context, uuid.UUID, uuid.UUID) (*model.InterviewPrepSession, error) {
	panic("unexpected call to GetActiveSessionByUserAndTask")
}

func (r *mockSubmitTestRepo) UpdateSessionCode(context.Context, uuid.UUID, string, string, bool) error {
	panic("unexpected call to UpdateSessionCode")
}

func (r *mockSubmitTestRepo) AdvanceSessionQuestion(context.Context, uuid.UUID, int32) error {
	panic("unexpected call to AdvanceSessionQuestion")
}

func (r *mockSubmitTestRepo) FinishSession(context.Context, uuid.UUID) error {
	panic("unexpected call to FinishSession")
}

func (r *mockSubmitTestRepo) UpsertQuestionResult(context.Context, *model.InterviewPrepQuestionResult) error {
	panic("unexpected call to UpsertQuestionResult")
}

func (r *mockSubmitTestRepo) ListQuestionResults(context.Context, uuid.UUID) ([]*model.InterviewPrepQuestionResult, error) {
	panic("unexpected call to ListQuestionResults")
}

func (r *mockSubmitTestRepo) GetCodeTask(context.Context, uuid.UUID) (*model.CodeTask, error) {
	panic("unexpected call to GetCodeTask")
}

func (r *mockSubmitTestRepo) GetAvailableCompanies(context.Context) ([]string, error) {
	panic("unexpected call to GetAvailableCompanies")
}

func (r *mockSubmitTestRepo) ListMockBlueprints(context.Context) ([]*model.InterviewMockBlueprintSummary, error) {
	panic("unexpected call to ListMockBlueprints")
}

func (r *mockSubmitTestRepo) ResolveMockBlueprint(context.Context, string, string) (*model.InterviewMockBlueprint, error) {
	panic("unexpected call to ResolveMockBlueprint")
}

func (r *mockSubmitTestRepo) ListBlueprintRounds(context.Context, uuid.UUID) ([]*model.InterviewBlueprintRound, error) {
	panic("unexpected call to ListBlueprintRounds")
}

func (r *mockSubmitTestRepo) SelectTaskForBlueprintRound(context.Context, *model.InterviewBlueprintRound, string) (*model.InterviewPrepTask, *uuid.UUID, error) {
	panic("unexpected call to SelectTaskForBlueprintRound")
}

func (r *mockSubmitTestRepo) CreateMockSession(context.Context, *model.InterviewPrepMockSession, []*model.InterviewPrepMockStage, []*model.InterviewPrepMockQuestionResult) error {
	panic("unexpected call to CreateMockSession")
}

func (r *mockSubmitTestRepo) GetMockSession(_ context.Context, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error) {
	if r.session != nil && r.session.ID == sessionID {
		return r.session, nil
	}
	//nolint:nilnil // Test fake mirrors repository not-found behavior.
	return nil, nil
}

func (r *mockSubmitTestRepo) GetActiveMockSessionByUserAndCompany(context.Context, uuid.UUID, string) (*model.InterviewPrepMockSession, error) {
	panic("unexpected call to GetActiveMockSessionByUserAndCompany")
}

func (r *mockSubmitTestRepo) GetAnyActiveMockSessionByUser(context.Context, uuid.UUID) (*model.InterviewPrepMockSession, error) {
	panic("unexpected call to GetAnyActiveMockSessionByUser")
}

func (r *mockSubmitTestRepo) UpdateMockStageSubmission(
	_ context.Context,
	stageID uuid.UUID,
	solveLanguage string,
	code string,
	passed bool,
	reviewScore int32,
	reviewSummary string,
	nextStatus model.InterviewPrepMockStageStatus,
) error {
	r.updateCalls = append(r.updateCalls, mockSubmitUpdateCall{
		stageID:       stageID,
		solveLanguage: solveLanguage,
		code:          code,
		passed:        passed,
		reviewScore:   reviewScore,
		reviewSummary: reviewSummary,
		nextStatus:    nextStatus,
	})
	return nil
}

func (r *mockSubmitTestRepo) CompleteMockQuestion(context.Context, uuid.UUID, int32, string, time.Time) error {
	panic("unexpected call to CompleteMockQuestion")
}

func (r *mockSubmitTestRepo) SetMockStageStatus(context.Context, uuid.UUID, model.InterviewPrepMockStageStatus) error {
	panic("unexpected call to SetMockStageStatus")
}

func (r *mockSubmitTestRepo) AdvanceMockSession(context.Context, uuid.UUID, int32) error {
	panic("unexpected call to AdvanceMockSession")
}

func (r *mockSubmitTestRepo) CompleteMockStage(context.Context, uuid.UUID) error {
	panic("unexpected call to CompleteMockStage")
}

func (r *mockSubmitTestRepo) FinishMockSession(context.Context, uuid.UUID) error {
	panic("unexpected call to FinishMockSession")
}

func (r *mockSubmitTestRepo) AbortMockSession(context.Context, uuid.UUID) error {
	panic("unexpected call to AbortMockSession")
}

type mockSubmitTestReviewer struct {
	calls   int
	errs    []error
	reviews []*aireview.InterviewSolutionReview
}

func (r *mockSubmitTestReviewer) ReviewSystemDesign(context.Context, aireview.SystemDesignReviewRequest) (*aireview.SystemDesignReview, error) {
	panic("unexpected call to ReviewSystemDesign")
}

func (r *mockSubmitTestReviewer) ReviewInterviewSolution(context.Context, aireview.InterviewSolutionReviewRequest) (*aireview.InterviewSolutionReview, error) {
	index := r.calls
	r.calls++

	var review *aireview.InterviewSolutionReview
	if index < len(r.reviews) {
		review = r.reviews[index]
	}
	var err error
	if index < len(r.errs) {
		err = r.errs[index]
	}
	return review, err
}

func (r *mockSubmitTestReviewer) ReviewInterviewAnswer(context.Context, aireview.InterviewAnswerReviewRequest) (*aireview.InterviewAnswerReview, error) {
	panic("unexpected call to ReviewInterviewAnswer")
}
