package arena

import (
	"context"

	"api/internal/metrics"
	v1 "api/pkg/api/arena/v1"

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
		return nil, mapErr(err)
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))

	metrics.IncSubmissions("arena", "total")
	if submission.IsCorrect {
		metrics.IncSubmissionsAccepted()
	} else {
		metrics.IncSubmissionsRejected()
	}

	resp := &v1.SubmitCodeResponse{
		Output:          submission.Output,
		Error:           submission.Error,
		IsCorrect:       submission.IsCorrect,
		PassedCount:     submission.PassedCount,
		TotalCount:      submission.TotalCount,
		RuntimeMs:       submission.RuntimeMs,
		Match:           mapArenaMatchForViewer(match, user.ID.String(), false),
		FailedTestIndex: submission.FailedTestIndex,
		FailureKind:     mapSubmitFailureKind(submission.FailureKind),
	}
	if submission.FreezeUntil != nil && !submission.FreezeUntil.IsZero() {
		resp.FreezeUntil = timestamppb.New(*submission.FreezeUntil)
	}
	return resp, nil
}
