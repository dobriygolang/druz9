package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapSubmissions(submissions []*codeeditordomain.Submission) []*v1.Submission {
	result := make([]*v1.Submission, 0, len(submissions))
	for _, submission := range submissions {
		if submission == nil {
			continue
		}
		result = append(result, &v1.Submission{
			Id:          submission.ID.String(),
			UserId:      userIDToString(submission.UserID),
			GuestName:   submission.GuestName,
			Code:        "",
			Output:      submission.Output,
			Error:       submission.Error,
			SubmittedAt: timestamppb.New(submission.SubmittedAt),
			DurationMs:  submission.DurationMs,
			IsCorrect:   submission.IsCorrect,
			PassedCount: submission.PassedCount,
			TotalCount:  submission.TotalCount,
		})
	}
	return result
}

func mapLeaderboard(entries []*codeeditordomain.LeaderboardEntry) []*v1.LeaderboardEntry {
	result := make([]*v1.LeaderboardEntry, 0, len(entries))
	for _, entry := range entries {
		if entry == nil {
			continue
		}
		result = append(result, &v1.LeaderboardEntry{
			UserId:      entry.UserID,
			DisplayName: entry.DisplayName,
			Wins:        entry.Wins,
			Matches:     entry.Matches,
			WinRate:     entry.WinRate,
			BestSolveMs: entry.BestSolveMs,
		})
	}
	return result
}
