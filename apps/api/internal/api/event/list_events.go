package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/event/v1"
)

func (i *Implementation) ListEvents(ctx context.Context, req *v1.ListEventsRequest) (*v1.ListEventsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	opts := model.ListEventsOptions{
		Limit:              req.GetLimit(),
		Offset:             req.GetOffset(),
		Status:             mapEventListFilter(req.GetStatus()),
		IncludeAllStatuses: user.IsAdmin,
		ViewerID:           &user.ID,
	}

	if req.GetCreatorId() != "" {
		creatorID, perr := uuid.Parse(req.GetCreatorId())
		if perr == nil {
			opts.CreatorID = &creatorID
		}
	}

	resp, err := i.service.ListEvents(ctx, user.ID, opts)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}

	return mapListEventsResponse(resp), nil
}