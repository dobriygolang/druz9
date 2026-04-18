package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"
)

// mapLeaderboard translates the domain leaderboard entries into their
// proto counterparts. Previously shared a file with mapSubmissions but
// the Submission message (and its RPC) were deleted as unused — this
// keeps only the live mapper.
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
