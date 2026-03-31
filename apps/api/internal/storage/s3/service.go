package s3

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"api/internal/config"
	"api/internal/model"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Service struct {
	client        *minio.Client
	presignClient *minio.Client
	bucket        string
}

func New(cfg *config.S3) (*Service, error) {
	if cfg == nil {
		return nil, fmt.Errorf("s3 config is required")
	}

	endpoint := strings.TrimSpace(cfg.Endpoint)
	if endpoint == "" {
		return nil, fmt.Errorf("s3 endpoint is required")
	}

	publicEndpoint := strings.TrimSpace(cfg.PublicEndpoint)

	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	client, err := minio.New(endpoint, &minio.Options{
		Creds: credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: strings.HasPrefix(
			strings.TrimSpace(cfg.Endpoint),
			"https://",
		),
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	var presignClient *minio.Client
	if publicEndpoint != "" {
		publicEndpointHost := strings.TrimPrefix(publicEndpoint, "http://")
		publicEndpointHost = strings.TrimPrefix(publicEndpointHost, "https://")

		presignClient, err = minio.New(publicEndpointHost, &minio.Options{
			Creds: credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
			Secure: strings.HasPrefix(publicEndpoint, "https://"),
		})
		if err != nil {
			return nil, fmt.Errorf("create presign minio client: %w", err)
		}
	}

	return &Service{
		client:        client,
		presignClient: presignClient,
		bucket:        cfg.Bucket,
	}, nil
}

func (s *Service) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("make bucket: %w", err)
	}
	return nil
}

func (s *Service) UploadObject(
	ctx context.Context,
	input model.UploadObjectRequest,
) error {
	key := normalizeObjectKey(input.Key)
	if key == "" {
		return fmt.Errorf("object key is required")
	}

	contentType := strings.TrimSpace(input.ContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := s.client.PutObject(
		ctx,
		s.bucket,
		key,
		bytes.NewReader(input.Content),
		int64(len(input.Content)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return fmt.Errorf("upload object: %w", err)
	}
	return nil
}

func (s *Service) DeleteObject(ctx context.Context, objectKey string) error {
	key := normalizeObjectKey(objectKey)
	if key == "" {
		return nil
	}
	if err := s.client.RemoveObject(
		ctx,
		s.bucket,
		key,
		minio.RemoveObjectOptions{},
	); err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

func (s *Service) PresignGetObject(
	ctx context.Context,
	objectKey string,
	options model.PresignOptions,
) (string, error) {
	key := normalizeObjectKey(objectKey)
	if key == "" {
		return "", fmt.Errorf("object key is required")
	}

	expiry := options.Expiry
	if expiry <= 0 {
		expiry = time.Hour
	}

	client := s.client
	if s.presignClient != nil {
		client = s.presignClient
	}

	u, err := client.PresignedGetObject(ctx, s.bucket, key, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("presign object: %w", err)
	}
	return u.String(), nil
}

func (s *Service) PresignPutObject(
	ctx context.Context,
	objectKey string,
	options model.PresignOptions,
) (string, error) {
	key := normalizeObjectKey(objectKey)
	if key == "" {
		return "", fmt.Errorf("object key is required")
	}

	expiry := options.Expiry
	if expiry <= 0 {
		expiry = 15 * time.Minute
	}

	client := s.client
	if s.presignClient != nil {
		client = s.presignClient
	}

	u, err := client.PresignedPutObject(ctx, s.bucket, key, expiry)
	if err != nil {
		return "", fmt.Errorf("presign put object: %w", err)
	}
	return u.String(), nil
}

func normalizeObjectKey(key string) string {
	key = strings.TrimSpace(key)
	key = strings.TrimPrefix(key, "/")
	key = path.Clean(key)
	if key == "." {
		return ""
	}
	return key
}

func parsePublicEndpoint(raw string) (*url.URL, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("parse S3_PUBLIC_ENDPOINT: %w", err)
	}
	if u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("S3_PUBLIC_ENDPOINT must include scheme and host")
	}
	return u, nil
}

func replacePresignedEndpoint(u *url.URL, publicEndpoint *url.URL) *url.URL {
	if u == nil || publicEndpoint == nil {
		return u
	}
	copyURL := *u
	copyURL.Scheme = publicEndpoint.Scheme
	copyURL.Host = publicEndpoint.Host
	return &copyURL
}
