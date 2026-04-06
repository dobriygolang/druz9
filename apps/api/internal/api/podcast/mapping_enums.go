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

func unmapContentType(ct v1.MediaContentType) string {
	switch ct {
	case v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_MPEG:
		return "audio/mpeg"
	case v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_WAV:
		return "audio/wav"
	case v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_OGG:
		return "audio/ogg"
	case v1.MediaContentType_MEDIA_CONTENT_TYPE_AUDIO_MP4:
		return "audio/mp4"
	default:
		return ""
	}
}
