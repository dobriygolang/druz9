package arena

import (
	"context"

	klog "github.com/go-kratos/kratos/v2/log"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/app/solutionreview"
	"api/internal/clients/notification/notiftext"
	"api/internal/metrics"
	"api/internal/model"
	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) SubmitCode(ctx context.Context, req *v1.SubmitCodeRequest) (*v1.SubmitCodeResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.GetMatchId())
	if err != nil {
		return nil, err
	}

	submission, match, err := i.service.SubmitCode(ctx, matchID, user, req.GetCode())
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
				Code:           req.GetCode(),
				Language:       "", // arena doesn't track language per-submission
				IsCorrect:      submission.IsCorrect,
				SolveTimeMs:    submission.RuntimeMs,
				PassedCount:    submission.PassedCount,
				TotalCount:     submission.TotalCount,
				TaskTitle:      match.Task.Title,
				TaskStatement:  match.Task.Statement,
				TaskDifficulty: match.Task.Difficulty.String(),
			}
			if _, err := i.reviewService.StartReview(ctx, input); err != nil {
				klog.Errorf("arena post-solve review match=%s submission=%s: %v", matchID, submission.ID, err)
			}
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
