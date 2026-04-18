package guild

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents guild domain service configuration.
type Config struct {
	Repository Repository
}

// Service implements guild domain logic.
type Service struct {
	repo Repository
}

// Repository is a data-layer interface for guild queries.
type Repository interface {
	ListGuilds(ctx context.Context, currentUserID uuid.UUID, opts model.ListGuildsOptions) (*model.ListGuildsResponse, error)
	CreateGuild(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Guild, error)
	JoinGuild(ctx context.Context, guildID, userID uuid.UUID) error
	LeaveGuild(ctx context.Context, guildID, userID uuid.UUID) error
	IsMember(ctx context.Context, guildID, userID uuid.UUID) (bool, error)
	ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error)
	InviteToGuild(ctx context.Context, guildID, inviterID, inviteeID uuid.UUID) error
	GetGuild(ctx context.Context, guildID uuid.UUID) (*model.Guild, error)
	DeleteGuild(ctx context.Context, guildID uuid.UUID) error
	GetGuildPulse(ctx context.Context, guildID uuid.UUID) (*model.GuildPulse, error)
	GetGuildMemberStats(ctx context.Context, guildID uuid.UUID) ([]*model.GuildMemberStats, error)
	CreateGuildChallenge(ctx context.Context, req model.CreateGuildChallengeRequest) (*model.GuildChallenge, error)
	GetActiveGuildChallenge(ctx context.Context, guildID uuid.UUID) (*model.GuildChallenge, error)
}

// NewService creates new guild domain service.
func NewService(c Config) *Service {
	return &Service{
		repo: c.Repository,
	}
}
