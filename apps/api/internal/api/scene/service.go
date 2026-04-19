package scene

import (
	"context"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	scenedata "api/internal/data/scene"
	v1 "api/pkg/api/scene/v1"
)

// SceneRepo abstracts the persistence layer so handlers stay testable.
type SceneRepo interface {
	Get(ctx context.Context, scope scenedata.Scope, ownerID uuid.UUID) (*scenedata.Layout, error)
	Upsert(
		ctx context.Context,
		scope scenedata.Scope,
		ownerID, updatedBy uuid.UUID,
		width, height int32,
		backgroundRef string,
		items []scenedata.PlacedItem,
	) (*scenedata.Layout, error)
	UserOwnsItems(ctx context.Context, userID uuid.UUID, itemIDs []uuid.UUID) (map[uuid.UUID]bool, error)
	GuildOwnsItems(ctx context.Context, guildID uuid.UUID, itemIDs []uuid.UUID) (map[uuid.UUID]bool, error)
}

// GuildRoleResolver returns the caller's role in a guild ("creator" /
// "officer" / "member"), or an error if they're not a member.
type GuildRoleResolver interface {
	GetMemberRole(ctx context.Context, userID, guildID uuid.UUID) (string, error)
}

type Service interface{}

// Implementation of scene service.
type Implementation struct {
	v1.UnimplementedSceneServiceServer
	scenes SceneRepo
	guilds GuildRoleResolver
}

// New returns new instance of Implementation.
func New(scenes SceneRepo, guilds GuildRoleResolver) *Implementation {
	return &Implementation{scenes: scenes, guilds: guilds}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.SceneService_ServiceDesc
}

const (
	defaultCanvasWidth  = 1200
	defaultCanvasHeight = 800
)
