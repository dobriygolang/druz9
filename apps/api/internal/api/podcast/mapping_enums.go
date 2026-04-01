package podcast

import (
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
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
