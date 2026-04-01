package arena

import (
	"context"

	arenadomain "api/internal/domain/arena"
	v1 "api/pkg/api/arena/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) LeaveMatch(ctx context.Context, req *v1.LeaveMatchRequest) (*v1.ArenaMatchResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.MatchId)
	if err != nil {
		return nil, err
	}

	match, err := i.service.LeaveMatch(ctx, matchID, user)
	if err != nil {
		switch {
		case errors.Is(err, arenadomain.ErrMatchNotFound):
			return nil, errors.NotFound("MATCH_NOT_FOUND", "arena match not found")
		case errors.Is(err, arenadomain.ErrPlayerNotInMatch):
			return nil, errors.Forbidden("PLAYER_NOT_IN_MATCH", "player is not in this match")
		case errors.Is(err, arenadomain.ErrMatchNotActive):
			return nil, errors.BadRequest("MATCH_NOT_ACTIVE", "arena match is not active")
		default:
			return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
		}
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))
	return &v1.ArenaMatchResponse{Match: mapArenaMatch(match)}, nil
}
