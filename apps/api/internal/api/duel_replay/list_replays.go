package duel_replay

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/duel_replay/v1"
)

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
