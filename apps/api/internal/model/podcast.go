package model

import (
	"time"

	"github.com/google/uuid"
)

type Podcast struct {
	ID              uuid.UUID
	Title           string
	AuthorID        string
	AuthorName      string
	DurationSeconds uint32
	ListensCount    uint64
	FileName        string
	ContentType     PodcastContentType
	ObjectKey       string
	IsUploaded      bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type CreatePodcastRequest struct {
	Title string
}

type UploadPodcastRequest struct {
	FileName        string
	ContentType     string
	Content         []byte
	ContentLength   int64
	DurationSeconds uint32
}

type PreparePodcastUploadRequest struct {
	FileName        string
	ContentType     string
	DurationSeconds uint32
}

type CompletePodcastUploadRequest struct {
	FileName        string
	ContentType     string
	DurationSeconds uint32
	ObjectKey       string
}

type ListPodcastsOptions struct {
	Limit  int32
	Offset int32
}

const (
	DefaultPodcastsLimit = 20
	MaxPodcastsLimit     = 100
)

type PodcastContentType int

const (
	PodcastContentTypeUnknown PodcastContentType = iota
	PodcastContentTypeAudioMpeg
	PodcastContentTypeAudioWav
	PodcastContentTypeAudioOgg
	PodcastContentTypeAudioMp4
)

func (c PodcastContentType) String() string {
	switch c {
	case PodcastContentTypeAudioMpeg:
		return "audio/mpeg"
	case PodcastContentTypeAudioWav:
		return "audio/wav"
	case PodcastContentTypeAudioOgg:
		return "audio/ogg"
	case PodcastContentTypeAudioMp4:
		return "audio/mp4"
	default:
		return ""
	}
}

func PodcastContentTypeFromString(s string) PodcastContentType {
	switch s {
	case "audio/mpeg":
		return PodcastContentTypeAudioMpeg
	case "audio/wav":
		return PodcastContentTypeAudioWav
	case "audio/ogg":
		return PodcastContentTypeAudioOgg
	case "audio/mp4":
		return PodcastContentTypeAudioMp4
	default:
		return PodcastContentTypeUnknown
	}
}

type ListPodcastsResponse struct {
	Podcasts    []*Podcast
	Limit       int32
	Offset      int32
	TotalCount  int32
	HasNextPage bool
}
