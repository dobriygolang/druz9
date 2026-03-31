package arena

import (
	"context"

	arenadomain "api/internal/domain/arena"
	"api/internal/server"
	v1 "api/pkg/api/arena/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) SubmitCode(ctx context.Context, req *v1.SubmitCodeRequest) (*v1.SubmitCodeResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.MatchId)
	if err != nil {
		return nil, err
	}

	submission, match, err := i.service.SubmitCode(ctx, matchID, user, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, arenadomain.ErrMatchNotFound):
			return nil, errors.NotFound("MATCH_NOT_FOUND", "arena match not found")
		case errors.Is(err, arenadomain.ErrPlayerNotInMatch):
			return nil, errors.Forbidden("PLAYER_NOT_IN_MATCH", "player is not in this match")
		case errors.Is(err, arenadomain.ErrPlayerFrozen):
			return nil, errors.BadRequest("PLAYER_FROZEN", "editing is frozen after previous failed submission")
		case errors.Is(err, arenadomain.ErrMatchNotActive):
			return nil, errors.BadRequest("MATCH_NOT_ACTIVE", "arena match is not active")
		default:
			return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
		}
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))

	server.IncSubmissions("arena", "total")
	if submission.IsCorrect {
		server.IncSubmissionsAccepted()
	} else {
		server.IncSubmissionsRejected()
	}

	resp := &v1.SubmitCodeResponse{
		Output:          submission.Output,
		Error:           submission.Error,
		IsCorrect:       submission.IsCorrect,
		PassedCount:     submission.PassedCount,
		TotalCount:      submission.TotalCount,
		RuntimeMs:       submission.RuntimeMs,
		Match:           mapArenaMatch(match),
		FailedTestIndex: submission.FailedTestIndex,
		FailureKind:     mapSubmitFailureKind(submission.FailureKind),
	}
	if submission.FreezeUntil != nil && !submission.FreezeUntil.IsZero() {
		resp.FreezeUntil = timestamppb.New(*submission.FreezeUntil)
	}
	return resp, nil
}
