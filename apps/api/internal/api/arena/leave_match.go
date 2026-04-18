package arena

import (
	"context"

	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) LeaveMatch(ctx context.Context, req *v1.LeaveMatchRequest) (*v1.ArenaMatchResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.GetMatchId())
	if err != nil {
		return nil, err
	}

	match, err := i.service.LeaveMatch(ctx, matchID, user)
	if err != nil {
		return nil, mapErr(err)
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))
	return &v1.ArenaMatchResponse{Match: mapArenaMatchForViewer(match, user.ID.String(), false)}, nil
}
