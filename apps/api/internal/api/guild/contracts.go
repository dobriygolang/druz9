package guild

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListGuilds(ctx context.Context, userID uuid.UUID, opts model.ListGuildsOptions) (*model.ListGuildsResponse, error)
	CreateGuild(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Guild, error)
	JoinGuild(ctx context.Context, userID, guildID uuid.UUID) error
	LeaveGuild(ctx context.Context, userID, guildID uuid.UUID) error
	InviteToGuild(ctx context.Context, inviterID, guildID, inviteeID uuid.UUID) error
	IsMember(ctx context.Context, userID, guildID uuid.UUID) (bool, error)
	ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error)
	DeleteGuild(ctx context.Context, userID, guildID uuid.UUID) error
	GetPulse(ctx context.Context, userID, guildID uuid.UUID) (*model.GuildPulse, error)
	GetMemberStats(ctx context.Context, userID, guildID uuid.UUID) ([]*model.GuildMemberStats, error)
	GetActiveChallenge(ctx context.Context, userID, guildID uuid.UUID) (*model.GuildChallenge, error)
	CreateChallenge(ctx context.Context, userID, guildID uuid.UUID, name string, prize int32) (*model.GuildChallenge, error)
}

// EventService handles event operations for guilds.
type EventService interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, creatorID uuid.UUID, isAdmin bool, req model.CreateEventRequest) (*model.Event, error)
}