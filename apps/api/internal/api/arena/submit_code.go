package arena

import (
	"context"

	"api/internal/app/solutionreview"
	"api/internal/metrics"
	"api/internal/model"
	"api/internal/notiftext"
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

	// Trigger post-solve review for arena submissions
	if i.reviewService != nil && match != nil && match.Task != nil {
		go func() {
			input := solutionreview.ReviewInput{
				SubmissionID:   submission.ID,
				UserID:         user.ID,
				TaskID:         match.TaskID,
				SourceType:     model.ReviewSourceDuel,
				Code:           req.Code,
				Language:       "", // arena doesn't track language per-submission
				IsCorrect:      submission.IsCorrect,
				SolveTimeMs:    submission.RuntimeMs,
				PassedCount:    submission.PassedCount,
				TotalCount:     submission.TotalCount,
				TaskTitle:      match.Task.Title,
				TaskStatement:  match.Task.Statement,
				TaskDifficulty: match.Task.Difficulty.String(),
			}
			_, _ = i.reviewService.StartReview(ctx, input) //nolint:errcheck // fire-and-forget
		}()
	}

	// Notify: duel_result — when match finishes, notify both players.
	if i.notif != nil && match != nil && match.Status == model.ArenaMatchStatusFinished {
		go func() {
			for _, p := range match.Players {
				isWinner := match.WinnerUserID != nil && *match.WinnerUserID == p.UserID
				isDraw := match.WinnerUserID == nil
				i.notif.Send(ctx, p.UserID.String(), "duel_result",
					notiftext.DuelResultTitle(),
					notiftext.DuelResultBody(match.Topic, isWinner, isDraw),
					map[string]any{"match_id": match.ID.String(), "topic": match.Topic, "is_winner": isWinner})
			}
		}()
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
		SubmissionId:    submission.ID.String(),
	}
	if submission.FreezeUntil != nil && !submission.FreezeUntil.IsZero() {
		resp.FreezeUntil = timestamppb.New(*submission.FreezeUntil)
	}
	return resp, nil
}
