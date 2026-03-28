package arena

import (
	"context"

	arenadomain "api/internal/domain/arena"
	v1 "api/pkg/api/arena/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) GetMatch(ctx context.Context, req *v1.GetMatchRequest) (*v1.ArenaMatchResponse, error) {
	matchID, err := parseArenaMatchID(req.MatchId)
	if err != nil {
		return nil, err
	}

	match, err := i.service.GetMatch(ctx, matchID)
	if err != nil {
		if errors.Is(err, arenadomain.ErrMatchNotFound) {
			return nil, errors.NotFound("MATCH_NOT_FOUND", "arena match not found")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.ArenaMatchResponse{Match: mapArenaMatch(match)}, nil
}
