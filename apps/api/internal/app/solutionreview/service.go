package solutionreview

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"api/internal/aireview"
	"api/internal/model"

	"github.com/google/uuid"
)

// ReviewRepository persists solution reviews and task stats.
type ReviewRepository interface {
	Create(ctx context.Context, review *model.SolutionReview) error
	UpdateAIReview(ctx context.Context, reviewID uuid.UUID, ai *model.SolutionReview) error
	MarkFailed(ctx context.Context, reviewID uuid.UUID) error
	GetBySubmission(ctx context.Context, submissionID uuid.UUID) (*model.SolutionReview, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.SolutionReview, error)
	CountUserAttempts(ctx context.Context, userID, taskID uuid.UUID) (int, error)
	GetTaskStats(ctx context.Context, taskID uuid.UUID) (*model.TaskStats, error)
	UpsertTaskStats(ctx context.Context, taskID uuid.UUID) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*model.SolutionReview, error)
}

// ReviewPublisher pushes review-ready events to connected clients.
type ReviewPublisher interface {
	PublishReviewReady(userID string, review *model.SolutionReview)
}

// Config holds all dependencies for the review service.
type Config struct {
	Repo      ReviewRepository
	Reviewer  aireview.CodeReviewer
	Publisher ReviewPublisher // may be nil (events not published)
	Logger    *slog.Logger
}

// Service orchestrates the post-solve review lifecycle.
type Service struct {
	repo      ReviewRepository
	reviewer  aireview.CodeReviewer
	publisher ReviewPublisher
	logger    *slog.Logger

	// Rate limiting: max 5 AI reviews per user per minute
	rateMu    sync.Mutex
	rateSlots map[uuid.UUID][]time.Time
}

func New(cfg Config) *Service {
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{
		repo:      cfg.Repo,
		reviewer:  cfg.Reviewer,
		publisher: cfg.Publisher,
		logger:    logger,
		rateSlots: make(map[uuid.UUID][]time.Time),
	}
}

// ReviewInput holds everything needed to kick off a review.
type ReviewInput struct {
	SubmissionID uuid.UUID
	UserID       uuid.UUID
	TaskID       uuid.UUID
	SourceType   model.ReviewSourceType

	// Submission data
	Code        string
	Language    string
	IsCorrect   bool
	SolveTimeMs int64
	PassedCount int32
	TotalCount  int32

	// Task metadata
	TaskTitle        string
	TaskStatement    string
	TaskDifficulty   string
	TaskPattern      string
	TaskOptimalTime  string
	TaskOptimalSpace string

	// Duel context (optional)
	OpponentCode         string
	OpponentLanguage     string
	OpponentSubmissionID *uuid.UUID
}

// StartReview creates the Level 1 review synchronously and launches async AI review.
// Returns the review ID immediately. The AI review will be pushed via WebSocket when ready.
func (s *Service) StartReview(ctx context.Context, input ReviewInput) (uuid.UUID, error) {
	// Count previous attempts
	attemptCount, err := s.repo.CountUserAttempts(ctx, input.UserID, input.TaskID)
	if err != nil {
		s.logger.Error("count attempts failed", "err", err)
		attemptCount = 0
	}
	attemptNumber := attemptCount + 1

	// Get median solve time
	stats, err := s.repo.GetTaskStats(ctx, input.TaskID)
	if err != nil {
		s.logger.Error("get task stats failed", "err", err)
		stats = &model.TaskStats{}
	}

	reviewID := uuid.New()
	review := &model.SolutionReview{
		ID:            reviewID,
		UserID:        input.UserID,
		SubmissionID:  input.SubmissionID,
		SourceType:    input.SourceType,
		TaskID:        input.TaskID,
		SourceCode:    input.Code,
		Language:      input.Language,
		IsCorrect:     input.IsCorrect,
		AttemptNumber: attemptNumber,
		SolveTimeMs:   input.SolveTimeMs,
		MedianTimeMs:  stats.MedianSolveTimeMs,
		PassedCount:   input.PassedCount,
		TotalCount:    input.TotalCount,
		Status:        model.ReviewStatusPending,
	}

	if err := s.repo.Create(ctx, review); err != nil {
		return uuid.Nil, err
	}

	// Only trigger AI review for accepted solutions by authenticated users
	if input.IsCorrect && s.reviewer != nil && s.isRateAllowed(input.UserID) {
		go s.runAIReview(reviewID, input, attemptNumber)
	} else if !input.IsCorrect {
		// For wrong answers, mark as ready immediately (no AI review)
		review.Status = model.ReviewStatusReady
		_ = s.repo.UpdateAIReview(ctx, reviewID, review)
	}

	return reviewID, nil
}

// GetReview returns a review by submission ID.
func (s *Service) GetReview(ctx context.Context, submissionID uuid.UUID) (*model.SolutionReview, error) {
	return s.repo.GetBySubmission(ctx, submissionID)
}

// GetReviewByID returns a review by its ID.
func (s *Service) GetReviewByID(ctx context.Context, id uuid.UUID) (*model.SolutionReview, error) {
	return s.repo.GetByID(ctx, id)
}

// runAIReview performs the LLM call and updates the review in the background.
func (s *Service) runAIReview(reviewID uuid.UUID, input ReviewInput, attemptNumber int) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req := aireview.CodeReviewRequest{
		TaskTitle:         input.TaskTitle,
		TaskStatement:     input.TaskStatement,
		TaskPattern:       input.TaskPattern,
		TaskOptimalTime:   input.TaskOptimalTime,
		TaskOptimalSpace:  input.TaskOptimalSpace,
		TaskDifficulty:    input.TaskDifficulty,
		CandidateCode:     input.Code,
		CandidateLanguage: input.Language,
		SolveTimeMs:       input.SolveTimeMs,
		AttemptNumber:     attemptNumber,
		PassedCount:       input.PassedCount,
		TotalCount:        input.TotalCount,
		OpponentCode:      input.OpponentCode,
		OpponentLanguage:  input.OpponentLanguage,
	}

	aiResult, err := s.reviewer.ReviewCode(ctx, req)
	if err != nil {
		s.logger.Error("ai code review failed",
			"reviewID", reviewID,
			"err", err,
		)
		_ = s.repo.MarkFailed(context.Background(), reviewID)
		return
	}

	update := &model.SolutionReview{
		Status:               model.ReviewStatusReady,
		AIVerdict:            model.AIVerdict(aiResult.Verdict),
		AITimeComplexity:     aiResult.TimeComplexity,
		AISpaceComplexity:    aiResult.SpaceComplexity,
		AIPattern:            aiResult.Pattern,
		AIStrengths:          aiResult.Strengths,
		AIWeaknesses:         aiResult.Weaknesses,
		AIHint:               aiResult.Hint,
		AISkillSignals:       aiResult.SkillSignals,
		AIProvider:           aiResult.Provider,
		AIModel:              aiResult.Model,
		ComparisonSummary:    aiResult.Comparison,
		OpponentSubmissionID: input.OpponentSubmissionID,
	}

	if err := s.repo.UpdateAIReview(context.Background(), reviewID, update); err != nil {
		s.logger.Error("save ai review failed", "reviewID", reviewID, "err", err)
		return
	}

	// Update task stats asynchronously
	go func() {
		bgCtx, bgCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer bgCancel()
		_ = s.repo.UpsertTaskStats(bgCtx, input.TaskID)
	}()

	// Publish review-ready event via WebSocket
	if s.publisher != nil {
		full, err := s.repo.GetByID(context.Background(), reviewID)
		if err == nil && full != nil {
			s.publisher.PublishReviewReady(input.UserID.String(), full)
		}
	}

	s.logger.Info("ai review completed",
		"reviewID", reviewID,
		"verdict", aiResult.Verdict,
		"pattern", aiResult.Pattern,
	)
}

// isRateAllowed checks per-user rate limit (5 reviews/minute).
func (s *Service) isRateAllowed(userID uuid.UUID) bool {
	s.rateMu.Lock()
	defer s.rateMu.Unlock()

	now := time.Now()
	cutoff := now.Add(-time.Minute)

	slots := s.rateSlots[userID]
	// Prune old entries
	valid := slots[:0]
	for _, t := range slots {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= 5 {
		s.rateSlots[userID] = valid
		return false
	}

	s.rateSlots[userID] = append(valid, now)
	return true
}
