package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) GetLeaderboard(ctx context.Context, req *v1.GetLeaderboardRequest) (*v1.GetLeaderboardResponse, error) {
	entries, err := i.service.GetLeaderboard(ctx, req.Limit)
	if err != nil {
		return nil, mapErr(err)
	}
	return &v1.GetLeaderboardResponse{Entries: mapLeaderboard(entries)}, nil
}
