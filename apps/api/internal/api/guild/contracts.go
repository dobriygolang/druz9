package guild

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListGuilds(context.Context, uuid.UUID, model.ListGuildsOptions) (*model.ListGuildsResponse, error)
	CreateGuild(context.Context, uuid.UUID, string, string, []string, bool) (*model.Guild, error)
	JoinGuild(context.Context, uuid.UUID, uuid.UUID) error
	LeaveGuild(context.Context, uuid.UUID, uuid.UUID) error
	InviteToGuild(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) error
	IsMember(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	ListGuildMembers(context.Context, uuid.UUID, int32) ([]*model.GuildMemberProfile, error)
	DeleteGuild(context.Context, uuid.UUID, uuid.UUID) error
	GetPulse(context.Context, uuid.UUID, uuid.UUID) (*model.GuildPulse, error)
	GetMemberStats(context.Context, uuid.UUID, uuid.UUID) ([]*model.GuildMemberStats, error)
	GetActiveChallenge(context.Context, uuid.UUID, uuid.UUID) (*model.GuildChallenge, error)
	CreateChallenge(context.Context, uuid.UUID, uuid.UUID, string, int32) (*model.GuildChallenge, error)
}

// EventService handles event operations for guilds.
type EventService interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, creatorID uuid.UUID, isAdmin bool, req model.CreateEventRequest) (*model.Event, error)
}
