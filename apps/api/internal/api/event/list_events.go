package event

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"github.com/google/uuid"
)

func (i *Implementation) ListEvents(ctx context.Context, req *v1.ListEventsRequest) (*v1.ListEventsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	opts := model.ListEventsOptions{
		Limit:              req.Limit,
		Offset:             req.Offset,
		Status:             mapEventListFilter(req.Status),
		IncludeAllStatuses: user.IsAdmin,
		ViewerID:           &user.ID,
	}

	if req.CreatorId != "" {
		creatorID, perr := uuid.Parse(req.CreatorId)
		if perr == nil {
			opts.CreatorID = &creatorID
		}
	}

	resp, err := i.service.ListEvents(ctx, user.ID, opts)
	if err != nil {
		return nil, err
	}

	return mapListEventsResponse(resp), nil
}
