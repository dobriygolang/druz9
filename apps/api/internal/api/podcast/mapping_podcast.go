package podcast

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

func mapPodcast(item *model.Podcast) *v1.Podcast {
	if item == nil {
		return nil
	}

	return &v1.Podcast{
		Id:              item.ID.String(),
		Title:           item.Title,
		AuthorId:        item.AuthorID,
		AuthorName:      item.AuthorName,
		DurationSeconds: item.DurationSeconds,
		ListensCount:    item.ListensCount,
		FileName:        item.FileName,
		ContentType:     mapContentType(item.ContentType),
		IsUploaded:      item.IsUploaded,
		CreatedAt:       timestamppb.New(item.CreatedAt),
	}
}
