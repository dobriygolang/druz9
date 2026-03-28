package arena

import (
	"context"

	arenadomain "api/internal/domain/arena"
	v1 "api/pkg/api/arena/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateMatch(ctx context.Context, req *v1.CreateMatchRequest) (*v1.ArenaMatchResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	match, err := i.service.CreateMatch(ctx, user, req.Topic, unmapDifficulty(req.Difficulty), req.ObfuscateOpponent)
	if err != nil {
		switch {
		case errors.Is(err, arenadomain.ErrNoAvailableTasks):
			return nil, errors.BadRequest("NO_AVAILABLE_TASKS", "no available arena tasks for this filter")
		case errors.Is(err, arenadomain.ErrGuestsNotSupported):
			return nil, errors.Forbidden("ARENA_REQUIRES_AUTH", "arena is available only for registered users")
		default:
			return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
		}
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))
	return &v1.ArenaMatchResponse{Match: mapArenaMatch(match)}, nil
}
