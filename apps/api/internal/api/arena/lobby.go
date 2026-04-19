package arena

import (
	"context"
	"errors"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"

	arenadata "api/internal/data/arena"
	v1 "api/pkg/api/arena/v1"
)

// LobbyRepo is the slice of data/arena.Repo this handler consumes.
type LobbyRepo interface {
	CreateLobby(ctx context.Context, mode string, creator uuid.UUID) (*arenadata.LobbyRow, error)
	JoinLobby(ctx context.Context, inviteCode string, userID uuid.UUID) (*arenadata.LobbyRow, error)
	LeaveLobby(ctx context.Context, lobbyID, userID uuid.UUID) error
	EnqueueLobby(ctx context.Context, lobbyID uuid.UUID) error
}

// WithLobbyRepo wires arena_lobbies (ADR-004). Optional: when nil, the
// lobby endpoints respond with NOT_CONFIGURED.
func (i *Implementation) WithLobbyRepo(r LobbyRepo) *Implementation {
	i.lobbies = r
	return i
}

func (i *Implementation) CreateLobby(ctx context.Context, req *v1.CreateLobbyRequest) (*v1.LobbyResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.lobbies == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "lobbies not wired")
	}
	row, err := i.lobbies.CreateLobby(ctx, req.GetMode(), user.ID)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to create lobby")
	}
	return &v1.LobbyResponse{Lobby: lobbyToProto(row)}, nil
}

func (i *Implementation) JoinLobby(ctx context.Context, req *v1.JoinLobbyRequest) (*v1.LobbyResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.lobbies == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "lobbies not wired")
	}
	if req.GetInviteCode() == "" {
		return nil, kratoserrors.BadRequest("INVALID_CODE", "invite_code required")
	}
	row, err := i.lobbies.JoinLobby(ctx, req.GetInviteCode(), user.ID)
	if err != nil {
		switch {
		case errors.Is(err, arenadata.ErrLobbyNotFound):
			return nil, kratoserrors.NotFound("LOBBY_NOT_FOUND", "lobby not found or expired")
		case errors.Is(err, arenadata.ErrLobbyFull):
			return nil, kratoserrors.BadRequest("LOBBY_FULL", "lobby is already full")
		}
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to join lobby")
	}
	return &v1.LobbyResponse{Lobby: lobbyToProto(row)}, nil
}

func (i *Implementation) LeaveLobby(ctx context.Context, req *v1.LeaveLobbyRequest) (*v1.ArenaStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.lobbies == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "lobbies not wired")
	}
	id, err := uuid.Parse(req.GetLobbyId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_LOBBY_ID", "invalid lobby_id")
	}
	if err := i.lobbies.LeaveLobby(ctx, id, user.ID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to leave lobby")
	}
	return &v1.ArenaStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func (i *Implementation) EnqueueLobby(ctx context.Context, req *v1.EnqueueLobbyRequest) (*v1.ArenaStatusResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.lobbies == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "lobbies not wired")
	}
	id, err := uuid.Parse(req.GetLobbyId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_LOBBY_ID", "invalid lobby_id")
	}
	if err := i.lobbies.EnqueueLobby(ctx, id); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to enqueue lobby")
	}
	return &v1.ArenaStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func lobbyToProto(l *arenadata.LobbyRow) *v1.ArenaLobby {
	if l == nil {
		return nil
	}
	out := &v1.ArenaLobby{
		Id:         l.ID.String(),
		Mode:       l.Mode,
		InviteCode: l.InviteCode,
		CreatedBy:  l.CreatedBy.String(),
		Status:     l.Status,
	}
	out.MemberUserIds = make([]string, len(l.Members))
	for i, m := range l.Members {
		out.MemberUserIds[i] = m.String()
	}
	return out
}
