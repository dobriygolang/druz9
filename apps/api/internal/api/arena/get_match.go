package arena

import (
	"context"

	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) GetMatch(ctx context.Context, req *v1.GetMatchRequest) (*v1.ArenaMatchResponse, error) {
	matchID, err := parseArenaMatchID(req.MatchId)
	if err != nil {
		return nil, err
	}

	match, err := i.service.GetMatch(ctx, matchID)
	if err != nil {
		return nil, mapErr(err)
	}

	return &v1.ArenaMatchResponse{Match: mapArenaMatch(match)}, nil
}
