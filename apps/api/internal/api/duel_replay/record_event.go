package duel_replay

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	duelreplaydomain "api/internal/domain/duel_replay"
	"api/internal/model"
	v1 "api/pkg/api/duel_replay/v1"
)

func (i *Implementation) RecordEvent(ctx context.Context, req *v1.RecordEventRequest) (*v1.RecordEventResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	replayID, parseErr := apihelpers.ParseUUID(req.GetReplayId(), "INVALID_REPLAY_ID", "replay_id")
	if parseErr != nil {
		return nil, parseErr
	}
	var linesCount *int32
	if req.GetLinesCount() != 0 {
		lc := req.GetLinesCount()
		linesCount = &lc
	}
	ev, err := i.service.RecordEvent(ctx, model.RecordEventInput{
		ReplayID:   replayID,
		UserID:     user.ID,
		TMs:        req.GetTMs(),
		Kind:       model.ReplayEventKind(req.GetKind()),
		Label:      req.GetLabel(),
		LinesCount: linesCount,
	})
	if err != nil {
		switch {
		case goerr.Is(err, duelreplaydomain.ErrReplayNotFound):
			return nil, errors.NotFound("REPLAY_NOT_FOUND", "replay does not exist")
		case goerr.Is(err, duelreplaydomain.ErrNotParticipant):
			return nil, errors.Forbidden("NOT_PARTICIPANT", "only participants can append events")
		case goerr.Is(err, duelreplaydomain.ErrBadTimeMs):
			return nil, errors.BadRequest("INVALID_T_MS", "t_ms is out of range")
		case goerr.Is(err, duelreplaydomain.ErrLabelTooLong):
			return nil, errors.BadRequest("LABEL_TOO_LONG", "label exceeds 200 characters")
		default:
			return nil, errors.InternalServer("INTERNAL", "failed to record event")
		}
	}
	return &v1.RecordEventResponse{Event: mapEvent(ev)}, nil
}
