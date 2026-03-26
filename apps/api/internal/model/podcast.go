package model

import (
	"time"

	"github.com/google/uuid"
)

type Podcast struct {
	ID              uuid.UUID `json:"id"`
	Title           string    `json:"title"`
	AuthorID        string    `json:"author_id"`
	AuthorName      string    `json:"author_name"`
	DurationSeconds uint32    `json:"duration_seconds"`
	ListensCount    uint64    `json:"listens_count"`
	FileName        string    `json:"file_name"`
	ContentType     string    `json:"content_type"`
	ObjectKey       string    `json:"object_key"`
	IsUploaded      bool      `json:"is_uploaded"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreatePodcastRequest struct {
	Title string `json:"title"`
}

type UploadPodcastRequest struct {
	FileName        string `json:"file_name"`
	ContentType     string `json:"content_type"`
	Content         []byte `json:"content"`
	ContentLength   int64  `json:"content_length"`
	DurationSeconds uint32 `json:"duration_seconds"`
}

type PreparePodcastUploadRequest struct {
	FileName        string `json:"file_name"`
	ContentType     string `json:"content_type"`
	DurationSeconds uint32 `json:"duration_seconds"`
}

type CompletePodcastUploadRequest struct {
	FileName        string `json:"file_name"`
	ContentType     string `json:"content_type"`
	DurationSeconds uint32 `json:"duration_seconds"`
	ObjectKey       string `json:"object_key"`
}

type ListPodcastsOptions struct {
	Limit  int32
	Offset int32
}

const (
	DefaultPodcastsLimit = 20
	MaxPodcastsLimit     = 100
)

type ListPodcastsResponse struct {
	Podcasts    []*Podcast
	Limit       int32
	Offset      int32
	TotalCount  int32
	HasNextPage bool
}
