package podcast

import (
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapContentType(contentType model.PodcastContentType) v1.MediaContentType {
	switch contentType {
	case model.PodcastContentTypeAudioMpeg:
		return v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_MPEG
	case model.PodcastContentTypeAudioWav:
		return v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_WAV
	case model.PodcastContentTypeAudioOgg:
		return v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_OGG
	case model.PodcastContentTypeAudioMp4:
		return v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_MP4
	default:
		return v1.MediaContentType_MEDIA_CONTENT_TYPE_UNSPECIFIED
	}
}

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
		UpdatedAt:       timestamppb.New(item.UpdatedAt),
	}
}
