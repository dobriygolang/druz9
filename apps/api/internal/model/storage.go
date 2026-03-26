package model

import "time"

type UploadObjectRequest struct {
	Key         string
	ContentType string
	Content     []byte
}

type PresignOptions struct {
	Expiry        time.Duration
	ContentType   string
	ContentLength int64
}
