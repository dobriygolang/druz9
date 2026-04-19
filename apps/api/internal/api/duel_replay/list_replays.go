package duel_replay

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/duel_replay/v1"
)

func (i *Implementation) ListMyReplays(ctx context.Context, req *v1.ListMyReplaysRequest) (*v1.ListReplaysResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	result, err := i.service.ListMyReplays(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, fmt.Errorf("list my replays: %w", err)
	}
	out := make([]*v1.ReplaySummary, 0, len(result.Replays))
	for _, r := range result.Replays {
		out = append(out, mapSummary(r))
	}
	return &v1.ListReplaysResponse{Replays: out, Total: result.Total}, nil
}
