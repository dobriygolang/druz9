package profile

import (
	"context"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) GetProfileFeed(ctx context.Context, req *v1.GetProfileFeedRequest) (*v1.GetProfileFeedResponse, error) {
	userID, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, err
	}
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 7
	}
	if limit > 20 {
		limit = 20
	}
	items, err := i.progressRepo.GetProfileFeed(ctx, userID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*v1.FeedItem, 0, len(items))
	for _, item := range items {
		fi := &v1.FeedItem{
			Type:        mapFeedItemType(item.Type),
			Title:       item.Title,
			Description: item.Description,
			Timestamp:   timestamppb.New(item.Timestamp),
		}
		if item.Score != nil {
			fi.Score = *item.Score
		}
		out = append(out, fi)
	}
	return &v1.GetProfileFeedResponse{Items: out}, nil
}
