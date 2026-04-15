package arena

import (
	"context"

	"api/internal/model"
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

	actor, _ := resolveArenaActor(ctx, false)
	viewerUserID, spectator := arenaViewerState(match, actor)
	if actor != nil && actor.Status == model.UserStatusGuest && !arenaViewerParticipates(match, actor.ID) {
		spectator = true
	}

	return &v1.ArenaMatchResponse{Match: mapArenaMatchForViewer(match, viewerUserID, spectator)}, nil
}
