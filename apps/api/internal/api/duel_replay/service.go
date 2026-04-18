package duel_replay

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	duelreplaydomain "api/internal/domain/duel_replay"
	"api/internal/model"
	v1 "api/pkg/api/duel_replay/v1"
)

// Service is the domain surface consumed by transport handlers.
type Service interface {
	GetReplay(ctx context.Context, replayID uuid.UUID, viewer *uuid.UUID) (*model.ReplayWithEvents, error)
	ListMyReplays(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ReplayList, error)
	RecordEvent(ctx context.Context, in model.RecordEventInput) (*model.DuelReplayEvent, error)
}

type Implementation struct {
	v1.UnimplementedDuelReplayServiceServer
	service Service
}

func New(service Service) *Implementation { return &Implementation{service: service} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.DuelReplayService_ServiceDesc
}

func (i *Implementation) GetReplay(ctx context.Context, req *v1.GetReplayRequest) (*v1.GetReplayResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	id, parseErr := apihelpers.ParseUUID(req.GetReplayId(), "INVALID_REPLAY_ID", "replay_id")
	if parseErr != nil {
		return nil, parseErr
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
			return nil, errors.InternalServer("INTERNAL", "failed to load replay")
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

func (i *Implementation) ListMyReplays(ctx context.Context, req *v1.ListMyReplaysRequest) (*v1.ListReplaysResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListMyReplays(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list replays")
	}
	out := make([]*v1.ReplaySummary, 0, len(result.Replays))
	for _, r := range result.Replays {
		out = append(out, mapSummary(r))
	}
	return &v1.ListReplaysResponse{Replays: out, Total: result.Total}, nil
}

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

// ---------- helpers ----------

func mapSummary(s *model.DuelReplaySummary) *v1.ReplaySummary {
	if s == nil {
		return nil
	}
	out := &v1.ReplaySummary{
		Id:              s.ID.String(),
		SourceKind:      v1.ReplaySourceKind(s.SourceKind),
		SourceId:        s.SourceID.String(),
		Player1Id:       s.Player1ID.String(),
		Player1Username: s.Player1Username,
		Player2Id:       s.Player2ID.String(),
		Player2Username: s.Player2Username,
		TaskTitle:       s.TaskTitle,
		TaskTopic:       s.TaskTopic,
		TaskDifficulty:  s.TaskDifficulty,
		DurationMs:      s.DurationMs,
		CompletedAt:     timestamppb.New(s.CompletedAt),
	}
	if s.WinnerID != nil {
		out.WinnerId = s.WinnerID.String()
	}
	return out
}

func mapEvent(e *model.DuelReplayEvent) *v1.ReplayEvent {
	if e == nil {
		return nil
	}
	out := &v1.ReplayEvent{
		Id:     e.ID.String(),
		UserId: e.UserID.String(),
		TMs:    e.TMs,
		Kind:   v1.EventKind(e.Kind),
		Label:  e.Label,
	}
	if e.LinesCount != nil {
		out.LinesCount = *e.LinesCount
	}
	return out
}
