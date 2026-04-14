package arena

import (
	"context"

	"api/internal/metrics"
	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) CreateMatch(ctx context.Context, req *v1.CreateMatchRequest) (*v1.ArenaMatchResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	match, err := i.service.CreateMatch(ctx, user, req.Topic, unmapDifficulty(req.Difficulty), req.ObfuscateOpponent)
	if err != nil {
		return nil, mapErr(err)
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))
	metrics.IncMatchesStarted()

	return &v1.ArenaMatchResponse{Match: mapArenaMatchForViewer(match, user.ID.String(), false)}, nil
}
