package duel_replay

import (
	"context"
	goerr "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	duelreplaydomain "api/internal/domain/duel_replay"
	v1 "api/pkg/api/duel_replay/v1"
)

func (i *Implementation) GetReplay(ctx context.Context, req *v1.GetReplayRequest) (*v1.GetReplayResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	id, parseErr := apihelpers.ParseUUID(req.GetReplayId(), "INVALID_REPLAY_ID", "replay_id")
	if parseErr != nil {
		return nil, fmt.Errorf("parse replay id: %w", parseErr)
	}
	viewer := user.ID
	result, err := i.service.GetReplay(ctx, id, &viewer)
	if err != nil {
		switch {
		case goerr.Is(err, duelreplaydomain.ErrReplayNotFound):
			return nil, errors.NotFound("REPLAY_NOT_FOUND", "replay does not exist")
		case goerr.Is(err, duelreplaydomain.ErrNotParticipant):
			return nil, errors.Forbidden("NOT_PARTICIPANT", "you were not part of this duel")
		default:
			return nil, fmt.Errorf("get replay: %w", err)
		}
	}

	events := make([]*v1.ReplayEvent, 0, len(result.Events))
	for _, e := range result.Events {
		events = append(events, mapEvent(e))
	}
	return &v1.GetReplayResponse{
		Summary: mapSummary(result.Summary),
		Events:  events,
	}, nil
}
