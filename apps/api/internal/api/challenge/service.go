package challenge

import (
	"context"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/model"
	v1 "api/pkg/api/challenge/v1"
)

// Service is the domain contract used by the transport layer. The types
// it speaks live in `internal/model` so the api handler doesn't depend
// on the data package.
//
// The daily-submit, weekly-submit and speed-run-record write paths used
// to live here but were deleted — they were never wired on the frontend
// and only grew surface area. If a challenge page starts accepting
// submissions, add them back with a test.
type Service interface {
	GetBlindReviewTask(ctx context.Context, userID uuid.UUID) (*model.BlindReviewTask, error)
	SubmitBlindReview(ctx context.Context, userID uuid.UUID, sourceReviewID uuid.UUID, taskID uuid.UUID, sourceCode, sourceLang, userReview string) (*model.BlindReviewResult, error)

	GetUserRecords(ctx context.Context, userID uuid.UUID, limit int) ([]model.TaskRecord, error)

	GetWeeklyTask(ctx context.Context, weekKey string) (*model.WeeklyInfo, error)
	GetWeeklyLeaderboard(ctx context.Context, weekKey string, limit int) ([]model.WeeklyEntry, error)
	GetUserWeeklyEntry(ctx context.Context, userID uuid.UUID, weekKey string) (*model.WeeklyEntry, error)
}

// Implementation is the gRPC/HTTP handler for ChallengeService.
type Implementation struct {
	v1.UnimplementedChallengeServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ChallengeService_ServiceDesc
}
