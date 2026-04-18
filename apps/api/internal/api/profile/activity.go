package profile

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) ListProfileActivity(ctx context.Context, req *v1.ListProfileActivityRequest) (*v1.ListProfileActivityResponse, error) {
	userID, err := apihelpers.ParseUUID(req.UserId, "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, err
	}

	limit := int(req.Limit)
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	items, err := i.progressRepo.GetProfileFeed(ctx, userID, limit)
	if err != nil {
		return nil, err
	}

	out := make([]*v1.ProfileActivityEntry, 0, len(items))
	for idx, item := range items {
		subtitle := item.Description
		if item.Score != nil {
			if subtitle != "" {
				subtitle = fmt.Sprintf("%s · %d pts", subtitle, *item.Score)
			} else {
				subtitle = fmt.Sprintf("%d pts", *item.Score)
			}
		}
		out = append(out, &v1.ProfileActivityEntry{
			Id:       fmt.Sprintf("%s-%d", item.Type, idx),
			Kind:     item.Type,
			Title:    item.Title,
			Subtitle: subtitle,
			At:       timestamppb.New(item.Timestamp),
		})
	}

	return &v1.ListProfileActivityResponse{Entries: out}, nil
}
