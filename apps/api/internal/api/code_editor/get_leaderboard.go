package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) GetLeaderboard(ctx context.Context, req *v1.GetLeaderboardRequest) (*v1.GetLeaderboardResponse, error) {
	entries, err := i.service.GetLeaderboard(ctx, req.Limit)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.GetLeaderboardResponse{Entries: mapLeaderboard(entries)}, nil
}
