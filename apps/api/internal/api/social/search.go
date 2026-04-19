package social

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/social/v1"
)

func (i *Implementation) SearchUsers(ctx context.Context, req *v1.SearchUsersRequest) (*v1.SearchUsersResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	hits, err := i.service.SearchUsers(ctx, user.ID, req.GetQuery(), req.GetLimit())
	if err != nil {
		klog.Errorf("social: search users viewer=%s q=%q: %v", user.ID, req.GetQuery(), err)
		return nil, errors.InternalServer("INTERNAL", "failed to search users")
	}
	return &v1.SearchUsersResponse{Users: mapHits(hits)}, nil
}

func mapHits(hits []*model.UserHit) []*v1.UserHit {
	out := make([]*v1.UserHit, 0, len(hits))
	for _, h := range hits {
		out = append(out, &v1.UserHit{
			UserId:      h.UserID,
			Username:    h.Username,
			DisplayName: h.DisplayName,
			AvatarUrl:   h.AvatarURL,
			IsFriend:    h.IsFriend,
			RequestSent: h.RequestSent,
		})
	}
	return out
}
