package hub

import (
	"context"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/model"
	v1 "api/pkg/api/hub/v1"
)

type ProfileRepository interface {
	FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error)
	GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error)
}

type MissionService interface {
	GetDailyMissions(ctx context.Context, userID uuid.UUID) (*model.DailyMissionsResponse, error)
}

type EventService interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
}

type ArenaService interface {
	ListOpenMatches(ctx context.Context, limit int32) ([]*model.ArenaMatch, error)
	GetLeaderboard(ctx context.Context, limit int32) ([]*model.ArenaLeaderboardEntry, error)
}

type GuildService interface {
	ListGuilds(ctx context.Context, userID uuid.UUID, opts model.ListGuildsOptions) (*model.ListGuildsResponse, error)
	ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error)
}

// SeasonService is the minimal slice of the season-pass domain the hub
// needs — only "what season is live right now". Keeps the hub decoupled
// from ladder/progress logic.
type SeasonService interface {
	GetActivePass(ctx context.Context, at time.Time) (*model.SeasonPass, error)
}

type Service struct {
	profiles ProfileRepository
	missions MissionService
	events   EventService
	arena    ArenaService
	guilds   GuildService
	seasons  SeasonService
}

// Implementation of hub service.
type Implementation struct {
	v1.UnimplementedHubServiceServer
	service *Service
}

// New returns new instance of Implementation.
func New(
	profiles ProfileRepository,
	missions MissionService,
	events EventService,
	arena ArenaService,
	guilds GuildService,
	seasons SeasonService,
) *Implementation {
	return &Implementation{
		service: &Service{
			profiles: profiles,
			missions: missions,
			events:   events,
			arena:    arena,
			guilds:   guilds,
			seasons:  seasons,
		},
	}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.HubService_ServiceDesc
}
