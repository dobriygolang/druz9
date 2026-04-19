package inbox

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/inbox/v1"
)

func (i *Implementation) ListThreads(ctx context.Context, req *v1.ListThreadsRequest) (*v1.ListThreadsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	result, err := i.service.ListThreads(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list inbox threads")
	}

	out := make([]*v1.InboxThread, 0, len(result.Threads))
	for _, t := range result.Threads {
		out = append(out, mapThread(t))
	}
	return &v1.ListThreadsResponse{
		Threads:     out,
		Total:       result.Total,
		UnreadTotal: result.UnreadTotal,
	}, nil
}
