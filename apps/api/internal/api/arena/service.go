package arena

import (
	"context"

	apparena "api/internal/app/arena"
	"api/internal/app/solutionreview"
	notif "api/internal/clients/notification"
	domain "api/internal/domain/arena"
	"api/internal/model"
	realtime "api/internal/realtime/schema"
	v1 "api/pkg/api/arena/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
//
// Service is the transport contract the arena handler speaks to. We
// removed queue/matchmaking, PlayerStatsBatch and SeasonHistory methods
// when their RPCs went away; the app-service methods for those were
// also deleted. If matchmaking returns, add both the RPC and the
// method back with explicit tests.
type Service interface {
	CreateMatch(ctx context.Context, creator *domain.User, topic string, difficulty model.ArenaDifficulty, obfuscateOpponent bool) (*domain.Match, error)
	GetMatch(ctx context.Context, matchID uuid.UUID) (*domain.Match, error)
	JoinMatch(ctx context.Context, matchID uuid.UUID, user *domain.User) (*domain.Match, error)
	LeaveMatch(ctx context.Context, matchID uuid.UUID, user *domain.User) (*domain.Match, error)
	SavePlayerCode(ctx context.Context, matchID uuid.UUID, user *domain.User, code string) error
	SubmitCode(ctx context.Context, matchID uuid.UUID, user *domain.User, code string) (*domain.Submission, *domain.Match, error)
	GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error)
	GetPlayerStats(ctx context.Context, userID uuid.UUID) (*domain.PlayerStats, error)
	ReportPlayerSuspicion(ctx context.Context, matchID uuid.UUID, user *domain.User, reason string) error
	ListOpenMatches(ctx context.Context, limit int32) ([]*domain.Match, error) // used by hub aggregator
	GetActiveSeason(ctx context.Context) (*model.ArenaSeason, error)
	GetLeaguePosition(ctx context.Context, userID string, rating int32) (rank int32, total int32, err error)
	GetGuildLeaderboard(ctx context.Context, limit int32) ([]*model.GuildLeaderboardEntry, error)
	GetSeasonXPLeaderboard(ctx context.Context, limit int32) ([]*model.SeasonXPEntry, int32, error)
}

//go:generate mockery --case underscore --name RealtimePublisher --with-expecter --output mocks
type RealtimePublisher interface {
	PublishMatch(match *realtime.ArenaMatch, codes []*realtime.ArenaPlayerCode)
}

// ReviewService provides post-solve review capabilities for arena matches.
type ReviewService interface {
	StartReview(ctx context.Context, input solutionreview.ReviewInput) (uuid.UUID, error)
}

type Implementation struct {
	v1.UnimplementedArenaServiceServer
	service          Service
	realtime         RealtimePublisher
	allowGuestAccess func() bool
	reviewService    ReviewService
	notif            notif.Sender
}

func New(service *apparena.Service, realtime RealtimePublisher, allowGuestAccess func() bool, reviewService ReviewService, n notif.Sender) *Implementation {
	if allowGuestAccess == nil {
		allowGuestAccess = func() bool { return false }
	}
	return &Implementation{
		service:          service,
		realtime:         realtime,
		allowGuestAccess: allowGuestAccess,
		reviewService:    reviewService,
		notif:            n,
	}
}

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ArenaService_ServiceDesc
}
