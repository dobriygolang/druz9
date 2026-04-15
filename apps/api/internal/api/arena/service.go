package arena

import (
	"context"

	apparena "api/internal/app/arena"
	"api/internal/app/solutionreview"
	domain "api/internal/domain/arena"
	"api/internal/model"
	realtime "api/internal/realtime/schema"
	v1 "api/pkg/api/arena/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	CreateMatch(ctx context.Context, creator *domain.User, topic string, difficulty model.ArenaDifficulty, obfuscateOpponent bool) (*domain.Match, error)
	GetMatch(ctx context.Context, matchID uuid.UUID) (*domain.Match, error)
	JoinMatch(ctx context.Context, matchID uuid.UUID, user *domain.User) (*domain.Match, error)
	LeaveMatch(ctx context.Context, matchID uuid.UUID, user *domain.User) (*domain.Match, error)
	SavePlayerCode(ctx context.Context, matchID uuid.UUID, user *domain.User, code string) error
	SubmitCode(ctx context.Context, matchID uuid.UUID, user *domain.User, code string) (*domain.Submission, *domain.Match, error)
	GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error)
	EnqueueMatchmaking(ctx context.Context, user *domain.User, topic, difficulty string, obfuscateOpponent bool) (*domain.QueueState, error)
	LeaveQueue(ctx context.Context, user *domain.User) error
	GetQueueStatus(ctx context.Context, user *domain.User) (*domain.QueueState, error)
	GetPlayerStats(ctx context.Context, userID uuid.UUID) (*domain.PlayerStats, error)
	GetPlayerStatsBatch(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*domain.PlayerStats, error)
	ReportPlayerSuspicion(ctx context.Context, matchID uuid.UUID, user *domain.User, reason string) error
	ListOpenMatches(ctx context.Context, limit int32) ([]*domain.Match, error)
	GetActiveSeason(ctx context.Context) (*model.ArenaSeason, error)
	GetLeaguePosition(ctx context.Context, userID string, rating int32) (rank int32, total int32, err error)
	GetSeasonHistory(ctx context.Context, userID string, limit int32) ([]*model.ArenaSeasonResult, error)
}

//go:generate mockery --case underscore --name RealtimePublisher --with-expecter --output mocks
type RealtimePublisher interface {
	PublishMatch(match *realtime.ArenaMatch, codes []*realtime.ArenaPlayerCode)
}

// ArenaReviewService provides post-solve review capabilities for arena matches.
type ArenaReviewService interface {
	StartReview(ctx context.Context, input solutionreview.ReviewInput) (uuid.UUID, error)
}

type Implementation struct {
	v1.UnimplementedArenaServiceServer
	service          Service
	realtime         RealtimePublisher
	allowGuestAccess func() bool
	reviewService    ArenaReviewService
}

func New(service *apparena.Service, realtime RealtimePublisher, allowGuestAccess func() bool, reviewService ArenaReviewService) *Implementation {
	if allowGuestAccess == nil {
		allowGuestAccess = func() bool { return false }
	}
	return &Implementation{
		service:          service,
		realtime:         realtime,
		allowGuestAccess: allowGuestAccess,
		reviewService:    reviewService,
	}
}

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ArenaService_ServiceDesc
}
