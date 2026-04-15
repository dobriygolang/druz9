package profile

import (
	"context"

	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) GetProfileFeed(ctx context.Context, req *v1.GetProfileFeedRequest) (*v1.GetProfileFeedResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}
	limit := int(req.Limit)
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
